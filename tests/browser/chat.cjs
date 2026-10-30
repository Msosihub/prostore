const fs = require("fs"),
  assert = require("assert/strict");
const { chromium } = require("playwright");
const state = JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));
Object.assign(process.env, state.env);
const { prisma } = require(state.stage + "/tests/integration/database.cjs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PROSTORE_CHROMIUM || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const otherBuyer = await prisma.user.create({
      data: { name: "Private unrelated buyer", role: "BUYER" },
    });
    const otherVendor = await prisma.user.create({
      data: { name: "Private unrelated vendor", role: "SUPPLIER" },
    });
    const own = await prisma.conversation.upsert({
      where: {
        buyerId_supplierId: {
          buyerId: state.fixture.buyer,
          supplierId: state.fixture.vendor,
        },
      },
      update: {},
      create: {
        buyerId: state.fixture.buyer,
        supplierId: state.fixture.vendor,
        productId: state.fixture.product,
      },
    });
    const foreign = await prisma.conversation.create({
      data: { buyerId: otherBuyer.id, supplierId: otherVendor.id },
    });
    await prisma.user.update({
      where: { id: state.fixture.buyer },
      data: { password: "private-chat-password-fixture" },
    });
    await prisma.message.create({
      data: {
        conversationId: foreign.id,
        senderId: otherBuyer.id,
        content: "private-foreign-message-fixture",
      },
    });
    const incoming = await prisma.message.create({
      data: {
        conversationId: own.id,
        senderId: state.fixture.buyer,
        content: "Participant-visible buyer message",
        moderationNote: "private-moderation-fixture",
      },
    });
    await prisma.message.create({
      data: {
        conversationId: own.id,
        senderId: state.fixture.vendor,
        content: "Participant-visible vendor message",
      },
    });
    const buyer = await browser.newContext({
      storageState: state.stage + "/buyer-session.json",
    });
    const vendor = await browser.newContext({
      storageState: state.stage + "/vendor-session.json",
    });
    for (const context of [buyer, vendor])
      await context.route("**/*", (r) =>
        new URL(r.request().url()).hostname === "127.0.0.1"
          ? r.continue()
          : r.abort(),
      );
    const page = await buyer.newPage();
    page.setDefaultTimeout(60000);
    await page.goto(state.baseUrl + "/buyer/chat");
    await page.waitForURL((url) => url.pathname === "/buyer/messages");
    await page.goto(state.baseUrl + "/chat-history?thread=" + own.id);
    await page
      .getByText("Participant-visible vendor message", { exact: true })
      .last()
      .waitFor();
    const list = await buyer.request.get(
      state.baseUrl + "/api/chat/conversations",
    );
    assert.equal(list.status(), 200);
    const rows = await list.json();
    assert.deepEqual(
      rows.map((r) => r.id),
      [own.id],
    );
    for (const marker of [
      "private-chat-password-fixture",
      "private-foreign-message-fixture",
      "private-moderation-fixture",
    ]) {
      assert(!JSON.stringify(rows).includes(marker));
      assert(!(await page.locator("body").innerText()).includes(marker));
    }
    assert.equal(
      (
        await buyer.request.post(state.baseUrl + "/api/chat/mark-seen", {
          data: {},
        })
      ).status(),
      400,
    );
    assert.equal(
      (
        await buyer.request.post(state.baseUrl + "/api/chat/mark-seen", {
          data: { conversationId: foreign.id },
        })
      ).status(),
      404,
    );
    assert.equal(
      (
        await buyer.request.post(state.baseUrl + "/api/inquiries", {
          data: {
            conversationId: foreign.id,
            productId: state.fixture.product,
            quantity: 2,
          },
        })
      ).status(),
      404,
    );
    const vpage = await vendor.newPage();
    vpage.setDefaultTimeout(60000);
    await vpage.goto(state.baseUrl + "/supplier/messages");
    await vpage.waitForURL(
      (url) => url.pathname === "/supplier/marketplace-chat",
    );
    await vpage.goto(state.baseUrl + "/chat-history?thread=" + own.id);
    await vpage
      .getByText("Participant-visible buyer message", { exact: true })
      .last()
      .waitFor();
    assert.equal(
      (await prisma.message.findUnique({ where: { id: incoming.id } })).seen,
      false,
    );
    await vpage.goto(state.baseUrl + "/chat-history?thread=" + foreign.id);
    assert(
      !(await vpage.locator("body").innerText()).includes(
        "private-foreign-message-fixture",
      ),
    );
    assert.equal(
      (
        await vendor.request.post(state.baseUrl + "/api/inquiries", {
          data: {
            conversationId: own.id,
            productId: state.fixture.product,
            quantity: 2,
          },
        })
      ).status(),
      404,
    );
    assert.equal(
      (
        await buyer.request.post(state.baseUrl + "/api/inquiries", {
          data: {
            conversationId: own.id,
            productId: state.fixture.product,
            quantity: 2,
          },
        })
      ).status(),
      200,
    );
    assert.equal(
      await prisma.inquiry.count({
        where: { conversationId: own.id, buyerId: state.fixture.buyer },
      }),
      1,
    );
    assert.equal(
      (
        await buyer.request.post(state.baseUrl + "/api/inquiries", {
          data: {
            conversationId: own.id,
            productId: state.fixture.product,
            quantity: 0.001,
          },
        })
      ).status(),
      400,
    );
    assert.equal(
      await prisma.inquiry.count({ where: { conversationId: own.id } }),
      1,
    );
    const anon = await browser.newContext();
    assert.equal(
      (
        await anon.request.get(state.baseUrl + "/api/chat/conversations")
      ).status(),
      401,
    );
    console.log(
      "PASS participant read-only archive and redirects, minimal polling payloads and buyer-owned inquiry; unrelated/anonymous denied",
    );
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
