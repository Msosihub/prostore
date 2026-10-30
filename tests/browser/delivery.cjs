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
    const vendor = await browser.newContext();
    await vendor.route("**/*", (r) =>
      new URL(r.request().url()).hostname === "127.0.0.1"
        ? r.continue()
        : r.abort(),
    );
    const p = await vendor.newPage();
    p.setDefaultTimeout(60000);
    p.on("dialog", (d) => d.accept());
    await p.goto(state.baseUrl + "/sign-in?callbackUrl=/supplier/orders");
    await p.locator("#identifier").fill("+255700000002");
    await p.getByRole("button", { name: "Tuma Msimbo wa OTP" }).click();
    await p.locator("#otp").waitFor();
    const otp = await prisma.verificationToken.findFirst({
      where: { identifier: "+255700000002" },
    });
    await p.locator("#otp").fill(otp.token);
    await p
      .getByRole("button", { name: "Thibitisha na Uingie Sokoni" })
      .click();
    await p.waitForURL("**/supplier/orders");
    await p
      .getByRole("button", { name: "Dispatch", exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await p
      .getByRole("dialog")
      .locator("textarea")
      .fill("Synthetic staging courier");
    await p.getByRole("button", { name: "Thibitisha Dispatch" }).click();
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    const item = await prisma.orderItem.findFirst({
      where: { orderId: state.orderId },
    });
    assert.equal(item.status, "DISPATCHED");
    console.log("PASS supplier OTP login → scoped orders UI → dispatch action");
    await vendor.storageState({ path: state.stage + "/vendor-session.json" });
    await p.screenshot({ path: state.stage + "/supplier-orders-desktop.png" });
    await p.goto(state.baseUrl + "/supplier/products");
    await p.getByText("Test Item", { exact: true }).first().waitFor();
    await p.screenshot({ path: state.stage + "/supplier-products-desktop.png" });
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
    page.on("dialog", async d => { console.log("Delivery action notice:", d.message()); await d.accept(); });
    await page.goto(state.baseUrl + "/order/" + state.orderId);
    const session = await (await buyer.request.get(state.baseUrl + "/api/auth/session")).json();
    assert.equal(session.user.id, state.fixture.buyer, "Delivery uses original buyer session");
    await page.getByRole("button", { name: "Nimepokea Bidhaa Hii" }).click();
    await page
      .getByRole("dialog")
      .locator("button:has(svg.lucide-star)")
      .nth(4)
      .click();
    await page
      .getByRole("dialog")
      .locator("textarea")
      .fill("Synthetic successful delivery");
    await page
      .getByRole("button", { name: "Nimepokea Salama", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    let wallet = await prisma.supplier.findUnique({
      where: { id: state.fixture.supplier },
    });
    assert.equal(Number(wallet.pendingBalance), 0);
    assert.equal(Number(wallet.walletBalance), 4000);
    assert.equal(await prisma.supplierLedger.count(), 2);
    assert.equal(
      (await prisma.order.findUnique({ where: { id: state.orderId } }))
        .isDelivered,
      true,
    );
    const feedback = await prisma.orderDeliveryFeedback.findUnique({
      where: {
        orderId_productId: {
          orderId: state.orderId,
          productId: state.fixture.product,
        },
      },
    });
    assert.equal(feedback.rating, 5);
    assert.equal(feedback.comment, "Synthetic successful delivery");
    await page.reload();
    assert.equal(
      await page.getByRole("button", { name: "Nimepokea Bidhaa Hii" }).count(),
      0,
    );
    assert.equal(await prisma.supplierLedger.count(), 2);
    console.log(
      "PASS buyer delivery UI → atomic release/feedback; reload does not release twice",
    );
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
