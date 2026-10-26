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
    await prisma.cart.deleteMany({ where: { userId: state.fixture.buyer } });
    await page.goto(state.baseUrl + "/product/test-item");
    for (let i = 0; i < 4; i++)
      await page.locator("button:has(svg.lucide-plus):visible").first().click();
    await page.getByRole("button", { name: "Weka Kikapuni" }).click();
    await page
      .getByText("Bidhaa imewekwa kwenye kikapu chako.", { exact: true })
      .waitFor();
    const cart = await prisma.cart.findFirst({
      where: { userId: state.fixture.buyer },
    });
    assert.equal(cart.items[0].qty, 5);
    assert.equal(cart.items[0].price, "800");
    assert.equal(Number(cart.itemsPrice), 4000);
    console.log(
      "PASS product UI tier quantity → cart action → canonical 5x800 database totals",
    );
    await page.goto(state.baseUrl + "/cart");
    await context.storageState({ path: state.stage + "/buyer-session.json" });
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
