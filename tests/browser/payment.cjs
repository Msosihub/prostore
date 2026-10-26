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
    });
    await context.route("**/*", (r) =>
      new URL(r.request().url()).hostname === "127.0.0.1"
        ? r.continue()
        : r.abort(),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("dialog", async (d) => {
      console.log("Dialog:", d.message());
      await d.accept();
    });
    await page.goto(state.baseUrl + "/shipping-address");
    await page.getByRole("button", { name: "Endelea na Uhakiki" }).click();
    await page.waitForURL("**/place-order");
    const responsePromise = page.waitForResponse((r) =>
      r.url().endsWith("/api/zenopay/create-payment"),
    );
    await page.getByRole("button", { name: "Agiza Sasa" }).click();
    const response = await responsePromise;
    const payment = await response.json();
    assert.equal(response.status(), 200);
    assert.equal(payment.success, true);
    assert.notEqual(payment.status, "COMPLETED");
    await page.waitForURL("**/user/orders");
    const order = await prisma.order.findFirst({
      where: { userId: state.fixture.buyer },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(order.isPaid, false);
    assert.equal(Number(order.totalPrice), 7000);
    assert.equal(
      (
        await prisma.product.findUnique({
          where: { id: state.fixture.product },
        })
      ).stock,
      30,
    );
    assert.equal(await prisma.supplierLedger.count(), 0);
    state.orderId = order.id;
    fs.writeFileSync(process.env.PROSTORE_BROWSER_STATE, JSON.stringify(state));
    console.log(
      "PASS checkout UI → action/order → payment API; pending keeps stock and escrow unchanged",
    );
    const post = () =>
      context.request.post(state.baseUrl + "/api/zenopay/create-payment", {
        data: { orderId: order.id },
      });
    const repeated = await Promise.all([post(), post()]);
    for (const response of repeated) {
      assert.equal(response.status(), 200);
      assert(["PENDING", "AMBIGUOUS"].includes((await response.json()).status));
    }
    await page.goto(state.baseUrl + "/order/" + order.id);
    await page
      .getByRole("button", { name: "Check existing payment", exact: true })
      .click();
    await page
      .getByText(
        "Payment is not confirmed. Wait at least 30 seconds before checking again; no new charge was sent.",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      (await prisma.order.findUnique({ where: { id: order.id } })).isPaid,
      false,
    );
    let fixture = JSON.parse(fs.readFileSync(state.stage + "/payments.json"));
    assert.equal(fixture.collections, 1);
    console.log("PASS repeat initiation reconciles; one mocked collection");
    fixture.orders[order.paymentResult.zenopay_order_id].status = "COMPLETED";
    fs.writeFileSync(state.stage + "/payments.json", JSON.stringify(fixture));
    await prisma.paymentAttempt.update({
      where: { orderId: order.id },
      data: { nextCheckAt: new Date(0) },
    });
    const webhook = () =>
      context.request.post(state.baseUrl + "/api/zenopay/webhook", {
        data: {
          order_id: order.paymentResult.zenopay_order_id,
          payment_status: "COMPLETED",
        },
      });
    const responses = await Promise.all([webhook(), webhook()]);
    console.log(
      "Callbacks:",
      responses.map((r) => r.status()),
    );
    assert(responses.some((r) => r.ok()));
    assert(responses.every((r) => [200, 503].includes(r.status())));
    assert.equal((await webhook()).status(), 200);
    assert.equal(
      (await prisma.order.findUnique({ where: { id: order.id } })).isPaid,
      true,
    );
    assert.equal(
      (
        await prisma.product.findUnique({
          where: { id: state.fixture.product },
        })
      ).stock,
      25,
    );
    assert.equal(await prisma.supplierLedger.count(), 1);
    assert.equal(
      Number(
        (
          await prisma.supplier.findUnique({
            where: { id: state.fixture.supplier },
          })
        ).pendingBalance,
      ),
      4000,
    );
    await page.goto(state.baseUrl + "/order/" + order.id);
    console.log(
      "PASS duplicate verified callbacks settle inventory/escrow once",
    );
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
