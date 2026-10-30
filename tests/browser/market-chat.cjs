const fs = require("fs"),
  assert = require("assert/strict");
const { randomUUID } = require("node:crypto");
const { chromium } = require("playwright");
const state = JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));
Object.assign(process.env, state.env);
const { prisma } = require(state.stage + "/tests/integration/database.cjs");
async function until(check) {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Database assertion timed out");
}
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PROSTORE_CHROMIUM || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  let dropMessage = false;
  async function context(storageState) {
    const c = await browser.newContext({
      storageState,
      viewport: { width: 375, height: 812 },
    });
    await c.route("**/*", async (r) => {
      if (new URL(r.request().url()).hostname !== "127.0.0.1") return r.abort();
      if (
        dropMessage &&
        r.request().method() === "POST" &&
        r.request().postData()?.includes("Retry-safe product question")
      ) {
        dropMessage = false;
        await r.fetch();
        return r.abort();
      }
      return r.continue();
    });
    return c;
  }
  try {
    const buyer = await context(state.stage + "/buyer-session.json"),
      seller = await context(state.stage + "/vendor-session.json");
    const bp = await buyer.newPage(),
      sp = await seller.newPage();
    bp.setDefaultTimeout(60000);
    sp.setDefaultTimeout(60000);
    await bp.goto(state.baseUrl + "/buyer/chat");
    await bp.waitForURL((url) => url.pathname === "/buyer/messages");
    await sp.goto(state.baseUrl + "/supplier/messages");
    await sp.waitForURL((url) => url.pathname === "/supplier/marketplace-chat");
    const legacy = await prisma.conversation.upsert({
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
      },
    });
    await prisma.message.create({
      data: {
        conversationId: legacy.id,
        senderId: state.fixture.buyer,
        content: "Archived text <script>alert(1)</script>",
      },
    });
    await bp.goto(state.baseUrl + "/chat-history?thread=" + legacy.id);
    await bp
      .getByText("Archived text <script>alert(1)</script>", { exact: true })
      .waitFor();
    assert.equal(await bp.locator("main textarea").count(), 0);
    assert.equal(await bp.locator("main input").count(), 0);
    await bp.screenshot({
      path: state.stage + "/chat-history-mobile.png",
      fullPage: true,
    });
    await bp.goto(state.baseUrl + "/product/test-item");
    await bp
      .getByRole("button", {
        name: "Ongea na muuzaji kuhusu bidhaa",
        exact: true,
      })
      .click();
    await bp.waitForURL((url) => url.pathname === "/buyer/messages");
    await bp.getByLabel("Ujumbe kuhusu bidhaa", { exact: true }).waitFor();
    const first = await prisma.marketThread.findFirst({
      where: { buyerId: state.fixture.buyer, productId: state.fixture.product },
    });
    assert(first);
    assert.equal(
      await bp
        .getByRole("button", {
          name: "Simu za ndani ya programu — zinakuja baadaye",
        })
        .isDisabled(),
      true,
    );
    await bp
      .getByLabel("Ujumbe kuhusu bidhaa", { exact: true })
      .fill("０７１２３４５６７８");
    await bp.getByRole("button", { name: "Tuma ujumbe", exact: true }).click();
    await bp
      .getByRole("alert")
      .getByText(/Tafadhali usitume simu/)
      .waitFor();
    assert.equal(
      await prisma.marketMessage.count({ where: { threadId: first.id } }),
      0,
    );
    await bp
      .getByLabel("Ujumbe kuhusu bidhaa", { exact: true })
      .fill("Retry-safe product question");
    dropMessage = true;
    await bp.getByRole("button", { name: "Tuma ujumbe", exact: true }).click();
    await until(
      async () =>
        (await prisma.marketMessage.count({
          where: { threadId: first.id },
        })) === 1,
    );
    await bp.reload();
    await bp.getByLabel("Ujumbe kuhusu bidhaa", { exact: true }).waitFor();
    await bp.waitForFunction(
      () =>
        document.querySelector("#market-message")?.value ===
        "Retry-safe product question",
    );
    await bp.getByRole("button", { name: "Tuma ujumbe", exact: true }).click();
    await bp
      .getByRole("status")
      .getByText("Ujumbe umehifadhiwa.", { exact: true })
      .waitFor();
    assert.equal(
      await prisma.marketMessage.count({ where: { threadId: first.id } }),
      1,
    );
    await sp.goto(state.baseUrl + "/supplier/marketplace-chat");
    await sp
      .getByRole("navigation", { name: "Mazungumzo" })
      .getByRole("button", { name: /Test Item/ })
      .click();
    await sp
      .getByLabel("Historia ya ujumbe")
      .getByText("Retry-safe product question", { exact: true })
      .waitFor();
    await sp.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new Error("Storage blocked in test");
      };
      Storage.prototype.removeItem = () => {
        throw new Error("Storage blocked in test");
      };
    });
    await sp
      .getByLabel("Ujumbe kuhusu bidhaa", { exact: true })
      .fill("Ndiyo, bidhaa ipo.");
    await sp.getByRole("button", { name: "Tuma ujumbe", exact: true }).click();
    // Reconnect with a gap bigger than one page; read older batch acknowledges it too.
    await prisma.marketMessage.createMany({
      data: Array.from({ length: 55 }, (_, i) => ({
        id: randomUUID(),
        threadId: first.id,
        senderId: state.fixture.vendor,
        content: "Maelezo ya bidhaa " + i,
        createdAt: new Date(Date.now() + i),
      })),
    });
    await bp
      .getByRole("button", { name: "Ujumbe wa awali", exact: true })
      .waitFor();
    await bp
      .getByRole("button", { name: "Ujumbe wa awali", exact: true })
      .click();
    await bp
      .getByLabel("Historia ya ujumbe")
      .getByText("Retry-safe product question", { exact: true })
      .waitFor();
    await until(
      async () =>
        (await prisma.marketMessage.count({
          where: {
            threadId: first.id,
            senderId: state.fixture.vendor,
            seen: false,
          },
        })) === 0,
    );
    await bp.waitForTimeout(5500);
    assert.equal(
      await bp
        .getByRole("button", { name: "Ujumbe wa awali", exact: true })
        .count(),
      0,
    );
    // A distinct seller/product joins the same buyer inbox.
    const vendorB = await prisma.user.create({
      data: {
        name: "Market Vendor B",
        phone: "+255700000005",
        role: "SUPPLIER",
        onboarded: true,
      },
    });
    const supplierB = await prisma.supplier.create({
      data: {
        userId: vendorB.id,
        name: "Market Store B",
        email: "market-b@example.test",
      },
    });
    const original = await prisma.product.findUnique({
      where: { id: state.fixture.product },
    });
    const { id, createdAt, ...copy } = original;
    const productB = await prisma.product.create({
      data: {
        ...copy,
        slug: "market-second",
        name: "Market Second Product",
        supplierId: supplierB.id,
        price: 2000,
        stock: 10,
      },
    });
    await bp.goto(state.baseUrl + "/product/market-second");
    await bp
      .getByRole("button", {
        name: "Ongea na muuzaji kuhusu bidhaa",
        exact: true,
      })
      .click();
    await bp.waitForURL((url) => url.pathname === "/buyer/messages");
    const nav = bp.getByRole("navigation", { name: "Mazungumzo" });
    await nav.getByRole("button", { name: /Market Second Product/ }).waitFor();
    await nav.getByRole("button", { name: /Test Item/ }).waitFor();
    await bp.getByLabel("Tafuta mazungumzo kwa bidhaa").fill("Market Second");
    await nav.getByRole("button", { name: "Tafuta", exact: true }).click();
    await bp.waitForTimeout(6000);
    assert.equal(
      await nav.getByRole("button", { name: /Test Item/ }).count(),
      0,
    );
    await nav.getByRole("button", { name: /Market Second Product/ }).waitFor();
    await bp.getByLabel("Tafuta mazungumzo kwa bidhaa").fill("");
    await nav.getByRole("button", { name: "Tafuta", exact: true }).click();
    await nav.getByRole("button", { name: /Test Item/ }).waitFor();
    const second = await prisma.marketThread.findFirst({
      where: { buyerId: state.fixture.buyer, productId: productB.id },
    });
    const c = await context(),
      vp = await c.newPage();
    await vp.goto(
      state.baseUrl + "/sign-in?callbackUrl=/supplier/marketplace-chat",
    );
    await vp.locator("#identifier").fill("+255700000005");
    await vp.getByRole("button", { name: "Tuma Msimbo wa OTP" }).click();
    await vp.locator("#otp").waitFor();
    const otp = await prisma.verificationToken.findFirst({
      where: { identifier: "+255700000005" },
    });
    await vp.locator("#otp").fill(otp.token);
    await vp
      .getByRole("button", { name: "Thibitisha na Uingie Sokoni" })
      .click();
    await vp.waitForURL((url) => url.pathname === "/supplier/marketplace-chat");
    await vp
      .getByRole("navigation", { name: "Mazungumzo" })
      .getByRole("button", { name: /Market Second Product/ })
      .waitFor();
    assert.equal(
      await vp
        .getByRole("navigation", { name: "Mazungumzo" })
        .getByRole("button", { name: /Test Item/ })
        .count(),
      0,
    );
    await vp.goto(
      state.baseUrl + "/supplier/marketplace-chat?thread=" + first.id,
    );
    await vp
      .getByRole("alert")
      .getByText(/Mazungumzo hayapatikani/)
      .waitFor();
    assert.equal(
      await vp
        .getByText("Retry-safe product question", { exact: true })
        .count(),
      0,
    );
    await sp.goto(
      state.baseUrl + "/supplier/marketplace-chat?thread=" + second.id,
    );
    await sp
      .getByRole("alert")
      .getByText(/Mazungumzo hayapatikani/)
      .waitFor();
    await sp.goto(
      state.baseUrl + "/supplier/marketplace-chat?thread=" + first.id,
    );
    await sp.getByLabel("Idadi ya bidhaa", { exact: true }).fill("5");
    await sp
      .getByRole("button", { name: "Tuma pendekezo", exact: true })
      .click();
    await sp
      .getByRole("status")
      .getByText("Pendekezo limehifadhiwa.", { exact: true })
      .waitFor();
    await bp.goto(state.baseUrl + "/buyer/messages?thread=" + first.id);
    await bp
      .getByRole("button", { name: "Hakiki pendekezo", exact: true })
      .click();
    await bp
      .getByRole("heading", { name: "Hakiki kabla ya kuagiza" })
      .waitFor();
    await bp.screenshot({
      path: state.stage + "/market-buyer-review-mobile.png",
      fullPage: true,
    });
    await sp.screenshot({
      path: state.stage + "/market-seller-proposal-mobile.png",
      fullPage: true,
    });
    const before = JSON.parse(
      fs.readFileSync(state.stage + "/payments.json"),
    ).collections;
    await bp
      .getByRole("button", { name: "Kubali na unda agizo", exact: true })
      .click();
    await bp.waitForURL((url) => /^\/order\//.test(url.pathname));
    const orderId = new URL(bp.url()).pathname.split("/").pop();
    let order = await prisma.order.findUnique({ where: { id: orderId } });
    assert.equal(order.isPaid, false);
    assert.equal(Number(order.totalPrice), 7000);
    assert.equal(
      JSON.parse(fs.readFileSync(state.stage + "/payments.json")).collections,
      before,
    );
    // Acceptance is separate from the existing authorized payment endpoint.
    const payment = bp.waitForResponse((r) =>
      r.url().endsWith("/api/zenopay/create-payment"),
    );
    await bp
      .getByRole("button", { name: "Endelea kulipa", exact: true })
      .click();
    assert.equal((await payment).status(), 200);
    order = await prisma.order.findUnique({ where: { id: orderId } });
    const provider = JSON.parse(
      fs.readFileSync(state.stage + "/payments.json"),
    );
    assert.equal(provider.collections, before + 1);
    assert.equal(
      Number(provider.orders[order.paymentResult.zenopay_order_id].amount),
      7000,
    );
    provider.orders[order.paymentResult.zenopay_order_id].status = "COMPLETED";
    fs.writeFileSync(state.stage + "/payments.json", JSON.stringify(provider));
    const callback = () =>
      buyer.request.post(state.baseUrl + "/api/zenopay/webhook", {
        data: {
          order_id: order.paymentResult.zenopay_order_id,
          payment_status: "COMPLETED",
        },
      });
    const callbacks = await Promise.all([callback(), callback()]);
    assert(callbacks.some((r) => r.ok()));
    assert(callbacks.every((r) => [200, 503].includes(r.status())));
    assert.equal((await callback()).status(), 200);
    assert.equal(
      await prisma.supplierLedger.count({
        where: { orderId, type: "ESCROW_CREDIT" },
      }),
      1,
    );
    await bp.goto(state.baseUrl + "/buyer/messages?thread=" + first.id);
    await bp.getByRole("link", { name: "Fungua agizo", exact: true }).waitFor();
    assert.equal(
      await prisma.order.count({
        where: { marketProposal: { threadId: first.id } },
      }),
      1,
    );
    assert.equal(
      await bp.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    // New arrivals beyond one inbox page must not hide older loaded threads.
    for (let i = 0; i < 31; i++) {
      const buyer = await prisma.user.create({
        data: { name: "Paged customer " + i },
      });
      await prisma.marketThread.create({
        data: {
          buyerId: buyer.id,
          supplierId: state.fixture.supplier,
          productId: state.fixture.product,
        },
      });
    }
    await sp.reload();
    await sp
      .getByRole("button", { name: "Mazungumzo zaidi", exact: true })
      .click();
    await sp
      .getByRole("navigation", { name: "Mazungumzo" })
      .getByRole("button", { name: /Test Item.*Test Buyer/ })
      .waitFor();
    await sp.waitForTimeout(5500);
    assert.equal(
      await sp
        .getByRole("navigation", { name: "Mazungumzo" })
        .getByRole("button", { name: /Test Item/ })
        .count(),
      32,
    );
    assert.equal(
      await sp
        .getByRole("button", { name: "Mazungumzo zaidi", exact: true })
        .count(),
      0,
    );
    const originalProposal = await prisma.marketProposal.findFirst({
      where: { threadId: first.id, status: "ACCEPTED" },
    });
    const oldOpen = await prisma.marketProposal.create({
      data: {
        id: randomUUID(),
        threadId: first.id,
        quantity: originalProposal.quantity,
        snapshot: originalProposal.snapshot,
        createdAt: new Date("2000-01-01T00:00:00Z"),
      },
    });
    await prisma.marketProposal.createMany({
      data: Array.from({ length: 24 }, () => ({
        id: randomUUID(),
        threadId: first.id,
        quantity: 2,
        status: "CANCELLED",
        snapshot: originalProposal.snapshot,
      })),
    });
    await bp.goto(state.baseUrl + "/chat-proposals?thread=" + first.id);
    await bp
      .getByRole("heading", { name: "Historia ya mapendekezo" })
      .waitFor();
    assert.equal(await bp.locator("main ol > li").count(), 20);
    await bp.getByRole("link", { name: "Ya awali", exact: true }).click();
    await bp.waitForURL((url) => url.searchParams.has("before"));
    assert.equal(await bp.locator("main ol > li").count(), 6);
    await bp.screenshot({
      path: state.stage + "/proposal-history-mobile.png",
      fullPage: true,
    });
    await bp
      .getByRole("link", { name: "Hakiki pendekezo hili", exact: true })
      .click();
    await bp.waitForURL(
      (url) => url.searchParams.get("proposal") === oldOpen.id,
    );
    await bp
      .getByRole("button", { name: "Zuia mazungumzo haya", exact: true })
      .click();
    await bp
      .getByRole("button", { name: "Ondoa kizuizi changu", exact: true })
      .waitFor();
    await bp
      .getByRole("button", { name: "Ripoti mazungumzo", exact: true })
      .click();
    await bp
      .getByText("Taarifa imehifadhiwa kwa ukaguzi.", { exact: true })
      .waitFor();
    assert.equal(
      await prisma.marketReport.count({ where: { threadId: first.id } }),
      1,
    );
    await bp
      .getByRole("button", { name: "Hakiki pendekezo", exact: true })
      .click();
    await bp
      .getByRole("button", { name: "Kubali na unda agizo", exact: true })
      .click();
    await until(
      async () =>
        !!(
          await prisma.marketProposal.findUnique({ where: { id: oldOpen.id } })
        ).orderId,
    );
    assert.equal(
      await prisma.marketBlock.count({
        where: { threadId: first.id, blocked: true },
      }),
      1,
    );
    await vp.goto(state.baseUrl + "/chat-proposals?thread=" + first.id);
    assert.equal(await vp.locator("main ol > li").count(), 0);
    const report = await prisma.marketReport.findFirst({
      where: { threadId: first.id },
    });
    await prisma.user.create({
      data: {
        name: "Synthetic Chat Reviewer",
        phone: "+255700000009",
        role: "ADMIN",
        onboarded: true,
      },
    });
    const ac = await context(),
      ap = await ac.newPage();
    await ap.goto(state.baseUrl + "/sign-in?callbackUrl=/admin/chat-reports");
    await ap.locator("#identifier").fill("+255700000009");
    await ap.getByRole("button", { name: "Tuma Msimbo wa OTP" }).click();
    await ap.locator("#otp").waitFor();
    const adminOtp = await prisma.verificationToken.findFirst({
      where: { identifier: "+255700000009" },
    });
    await ap.locator("#otp").fill(adminOtp.token);
    await ap
      .getByRole("button", { name: "Thibitisha na Uingie Sokoni" })
      .click();
    await ap.waitForURL((url) => url.pathname === "/admin/chat-reports");
    await ap.goto(state.baseUrl + "/admin/chat-reports/" + report.id);
    await ap
      .getByRole("button", { name: "Record review", exact: true })
      .click();
    await ap.getByText(/Review recorded/).waitFor();
    assert.equal(
      await prisma.marketReportEvent.count({ where: { reportId: report.id } }),
      1,
    );
    await ap.screenshot({
      path: state.stage + "/chat-report-admin-mobile.png",
      fullPage: true,
    });

    console.log(
      "PASS first-party buyer/two-seller inbox isolation, contact rejection, interrupted-send reload retry, paged unread history, canonical proposal → explicit acceptance → separate mocked payment/one escrow credit",
    );
  } catch (error) {
    for (const [i, c] of browser.contexts().entries())
      for (const p of c.pages())
        await p
          .screenshot({ path: state.stage + "/market-failure-" + i + ".png" })
          .catch(() => {});
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
