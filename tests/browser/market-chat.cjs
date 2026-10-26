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
    assert((await Promise.all([callback(), callback()])).every((r) => r.ok()));
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
        .getByRole("button")
        .count(),
      32,
    );
    assert.equal(
      await sp
        .getByRole("button", { name: "Mazungumzo zaidi", exact: true })
        .count(),
      0,
    );
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
