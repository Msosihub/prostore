const fs = require("fs"),
  assert = require("assert/strict");
const { chromium } = require("playwright");
const state = JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));
Object.assign(process.env, state.env);
const db = require(state.stage + "/tests/integration/database.cjs");
const { prisma } = db;
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PROSTORE_CHROMIUM || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const buyer = await browser.newContext({
      storageState: state.stage + "/buyer-session.json",
    });
    await buyer.route("**/*", (r) =>
      new URL(r.request().url()).hostname === "127.0.0.1"
        ? r.continue()
        : r.abort(),
    );
    const page = await buyer.newPage();
    page.setDefaultTimeout(60000);
    const csrf = await (
      await buyer.request.get(state.baseUrl + "/api/auth/csrf")
    ).json();
    const updatedSession = await buyer.request.post(
      state.baseUrl + "/api/auth/session",
      {
        data: { csrfToken: csrf.csrfToken, data: { role: "ADMIN" } },
      },
    );
    assert.equal(updatedSession.status(), 200);
    assert.equal((await updatedSession.json()).user.role, "BUYER");
    const session = await (
      await buyer.request.get(state.baseUrl + "/api/auth/session")
    ).json();
    assert.equal(session.user.role, "BUYER");
    await page.goto(state.baseUrl + "/supplier/orders");
    await page.waitForURL("**/unauthorized");
    const anon = await browser.newContext();
    assert.equal(
      (
        await anon.request.post(state.baseUrl + "/api/zenopay/create-payment", {
          data: { orderId: state.orderId },
        })
      ).status(),
      401,
    );
    const vendor = await browser.newContext({
      storageState: state.stage + "/vendor-session.json",
    });
    const foreign = await vendor.request.post(
      state.baseUrl + "/api/zenopay/create-payment",
      { data: { orderId: state.orderId } },
    );
    assert([403, 404].includes(foreign.status()));
    console.log(
      "PASS browser-session role update cannot escalate; buyer supplier UI denied; anonymous/foreign payments denied",
    );
    const user = await prisma.user.findUnique({
        where: { id: state.fixture.buyer },
      }),
      product = await prisma.product.findUnique({
        where: { id: state.fixture.product },
      });
    let order = await db.newOrder({
      user,
      product,
      qty: 2,
      paymentResult: db.Prisma.DbNull,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { shippingAddress: user.address },
    });
    await prisma.orderItem.updateMany({
      where: { orderId: order.id },
      data: { image: "/images/logo.svg" },
    });
    let fixture = JSON.parse(fs.readFileSync(state.stage + "/payments.json"));
    fixture.interruptNext = true;
    fs.writeFileSync(state.stage + "/payments.json", JSON.stringify(fixture));
    const initiate = () =>
      buyer.request.post(state.baseUrl + "/api/zenopay/create-payment", {
        data: { orderId: order.id },
      });
    assert.equal((await initiate()).status(), 502);
    order = await prisma.order.findUnique({ where: { id: order.id } });
    assert(order.paymentResult.zenopay_order_id);
    assert.equal(order.isPaid, false);
    const retry = await initiate();
    assert.equal(retry.status(), 200);
    assert.equal((await retry.json()).status, "PENDING");
    fixture = JSON.parse(fs.readFileSync(state.stage + "/payments.json"));
    assert.equal(fixture.collections, 2);
    assert.equal(
      (await prisma.product.findUnique({ where: { id: product.id } })).stock,
      25,
    );
    console.log(
      "PASS interrupted collection response retains attempt; retry reconciles without a second charge",
    );
    fixture.orders[order.paymentResult.zenopay_order_id] = {
      amount: 2000,
      status: "COMPLETED",
    };
    fs.writeFileSync(state.stage + "/payments.json", JSON.stringify(fixture));
    const settled = await buyer.request.post(
      state.baseUrl + "/api/zenopay/webhook",
      { data: { order_id: order.paymentResult.zenopay_order_id } },
    );
    assert.equal(settled.status(), 200);
    await page.goto(state.baseUrl + "/order/" + order.id);
    await page.getByRole("button", { name: "Nimepokea Bidhaa Hii" }).click();
    await page
      .getByRole("button", { name: "Nina tatizo na bidhaa hii" })
      .click();
    await page
      .getByRole("dialog")
      .locator("textarea")
      .fill("Synthetic damaged item report");
    await page.getByRole("button", { name: "Tuma Taarifa kwa Admin" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(
      (
        await prisma.returnRequest.findUnique({
          where: {
            orderId_productId: { orderId: order.id, productId: product.id },
          },
        })
      ).status,
      "REQUESTED",
    );
    assert.equal(
      (await prisma.orderItem.findFirst({ where: { orderId: order.id } }))
        .status,
      "REJECTED",
    );
    await page.reload();
    await page.getByRole("button", { name: "Nimepokea Bidhaa Hii" }).click();
    await page
      .getByRole("dialog")
      .locator("button:has(svg.lucide-star)")
      .nth(4)
      .click();
    const reply = page.waitForResponse(
      (r) => r.request().method() === "POST" && r.url().includes("/order/"),
    );
    await page
      .getByRole("button", { name: "Nimepokea Salama", exact: true })
      .click();
    await reply;
    const wallet = await prisma.supplier.findUnique({
      where: { id: state.fixture.supplier },
    });
    assert.equal(Number(wallet.pendingBalance), 2000);
    assert.equal(Number(wallet.walletBalance), 4000);
    assert.equal(await prisma.supplierLedger.count(), 3);
    assert.equal(
      (await prisma.order.findUnique({ where: { id: order.id } })).isDelivered,
      false,
    );
    console.log(
      "PASS dispute UI creates request; later delivery UI cannot release disputed escrow",
    );
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
