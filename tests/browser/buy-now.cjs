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
    const context = await browser.newContext({
      storageState: state.stage + "/buyer-session.json",
      viewport: { width: 375, height: 812 },
    });
    await context.route("**/*", (r) =>
      new URL(r.request().url()).hostname === "127.0.0.1"
        ? r.continue()
        : r.abort(),
    );
    const page = await context.newPage();
    page.on("dialog", (d) => d.accept());
    page.setDefaultTimeout(60000);
    // The first cart/browser checkout used this same product at quantity five.
    const cartOrder = await prisma.order.findUnique({
      where: { id: state.orderId },
      include: { orderitems: true },
    });
    assert.equal(cartOrder.orderitems[0].qty, 5);
    assert.equal(Number(cartOrder.itemsPrice), 4000);
    for (const qty of ["1.5", "0", "-1", "5junk"]) {
      await page.goto(
        state.baseUrl +
          "/place-order2?buyNow=1&productId=test-item&qty=" +
          encodeURIComponent(qty),
      );
      await page
        .getByRole("alert")
        .getByText("Agizo halipatikani kwa sasa")
        .waitFor();
      assert.equal(
        await page.getByRole("button", { name: "Bonyeza kuagiza" }).count(),
        0,
      );
    }
    await page.goto(state.baseUrl + "/product/test-item");
    for (let i = 0; i < 4; i++)
      await page.locator("button:has(svg.lucide-plus):visible").first().click();
    await page.getByRole("button", { name: "Nunua Sasa", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/place-order2");
    assert.equal(new URL(page.url()).searchParams.get("qty"), "5");
    await page.getByRole("heading", { name: "Agiza Mzigo" }).waitFor();
    const review = await page.locator("main").innerText();
    assert(review.includes("4,000"));
    assert(review.includes("3,000"));
    assert(review.includes("7,000"));
    await page.screenshot({
      path: state.stage + "/buy-now-review-mobile.png",
      fullPage: true,
    });
    const beforeStock = (
      await prisma.product.findUnique({ where: { id: state.fixture.product } })
    ).stock;
    const beforeWallet = await prisma.supplier.findUnique({
      where: { id: state.fixture.supplier },
    });
    const beforeCollections = JSON.parse(
      fs.readFileSync(state.stage + "/payments.json"),
    ).collections;
    const paymentResponse = page.waitForResponse((r) =>
      r.url().endsWith("/api/zenopay/create-payment"),
    );
    await page
      .locator("button:visible")
      .filter({ hasText: "Bonyeza kuagiza" })
      .click();
    assert.equal((await paymentResponse).status(), 200);
    await page.waitForURL((url) => url.pathname === "/user/orders");
    let order = await prisma.order.findFirst({
      where: { userId: state.fixture.buyer },
      orderBy: { createdAt: "desc" },
      include: { orderitems: true },
    });
    assert.notEqual(order.id, cartOrder.id);
    assert.equal(order.isPaid, false);
    for (const key of ["itemsPrice", "shippingPrice", "taxPrice", "totalPrice"])
      assert.equal(Number(order[key]), Number(cartOrder[key]));
    for (const key of [
      "productId",
      "supplierId",
      "supplierName",
      "qty",
      "name",
    ])
      assert.equal(order.orderitems[0][key], cartOrder.orderitems[0][key]);
    assert.equal(
      Number(order.orderitems[0].price),
      Number(cartOrder.orderitems[0].price),
    );
    assert.equal(
      (
        await prisma.product.findUnique({
          where: { id: state.fixture.product },
        })
      ).stock,
      beforeStock,
    );
    let provider = JSON.parse(fs.readFileSync(state.stage + "/payments.json"));
    assert.equal(provider.collections, beforeCollections + 1);
    assert.equal(
      Number(provider.orders[order.paymentResult.zenopay_order_id].amount),
      7000,
    );
    provider.orders[order.paymentResult.zenopay_order_id].status = "COMPLETED";
    fs.writeFileSync(state.stage + "/payments.json", JSON.stringify(provider));
    const callback = () =>
      context.request.post(state.baseUrl + "/api/zenopay/webhook", {
        data: {
          order_id: order.paymentResult.zenopay_order_id,
          payment_status: "COMPLETED",
        },
      });
    assert((await Promise.all([callback(), callback()])).every((r) => r.ok()));
    assert.equal(
      (
        await prisma.product.findUnique({
          where: { id: state.fixture.product },
        })
      ).stock,
      beforeStock - 5,
    );
    const ledger = await prisma.supplierLedger.findMany({
      where: { orderId: order.id, type: "ESCROW_CREDIT" },
    });
    assert.equal(ledger.length, 1);
    assert.equal(Number(ledger[0].amount), 4000);
    assert.equal(
      Number(
        (
          await prisma.supplier.findUnique({
            where: { id: state.fixture.supplier },
          })
        ).pendingBalance,
      ),
      Number(beforeWallet.pendingBalance) + 4000,
    );
    await page.goto(state.baseUrl + "/order/" + order.id);
    await page.getByText("Test Item", { exact: true }).waitFor();
    const seller = await browser.newContext({
      storageState: state.stage + "/vendor-session.json",
      viewport: { width: 375, height: 812 },
    });
    await seller.route("**/*", (r) =>
      new URL(r.request().url()).hostname === "127.0.0.1"
        ? r.continue()
        : r.abort(),
    );
    const sp = await seller.newPage();
    await sp.goto(state.baseUrl + "/supplier/orders/" + order.id);
    await sp.getByRole("heading", { name: "Test Item", exact: true }).waitFor();
    assert((await sp.locator("main").innerText()).includes("4,000"));
    await sp.goto(state.baseUrl + "/supplier/overview");
    await sp
      .getByText("Thamani ya Bidhaa Zilizolipiwa", { exact: true })
      .waitFor();
    const ownPaid = await prisma.orderItem.findMany({
      where: { supplierId: state.fixture.supplier, order: { isPaid: true } },
    });
    const total = ownPaid.reduce((sum, i) => sum + Number(i.price) * i.qty, 0);
    assert(
      (await sp.locator("main").innerText()).includes(
        total.toLocaleString("en-US"),
      ),
    );
    await sp.screenshot({
      path: state.stage + "/buy-now-seller-summary-mobile.png",
    });
    console.log(
      "PASS Buy Now matches cart 5x800 +3000 shipping, provider7000 and seller escrow4000; invalid URL quantities blocked; duplicate callbacks settle once",
    );
  } catch (e) {
    for (const c of browser.contexts())
      for (const p of c.pages())
        await p
          .screenshot({
            path:
              state.stage +
              "/buy-now-failure-" +
              browser.contexts().indexOf(c) +
              ".png",
          })
          .catch(() => {});
    throw e;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
