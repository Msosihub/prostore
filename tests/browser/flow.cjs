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
    const context = await browser.newContext();
    await context.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue()
        : route.abort(),
    );
    const retired = await context.request.post(state.baseUrl + "/api/auth/send-sms", {
      data: { to: "+255700000000", message: "must not send" },
    });
    assert.equal(retired.status(), 410);
    const invalidOtp = await context.request.post(state.baseUrl + "/api/auth/send-otp", {
      data: { identifier: "+255700000000,+255700000001" },
    });
    assert.equal(invalidOtp.status(), 400);
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    await page.goto(state.baseUrl + "/sign-in?callbackUrl=/product/test-item");
    await page.locator("#identifier").fill("+255700000000");
    await page.getByRole("button", { name: "Tuma Msimbo wa OTP" }).click();
    await page.locator("#otp").waitFor();
    const record = await prisma.verificationToken.findFirst({
      where: { identifier: "+255700000000" },
    });
    assert(record);
    await page.locator("#otp").fill(record.token);
    await page
      .getByRole("button", { name: "Thibitisha na Uingie Sokoni" })
      .click();
    await page.waitForURL("**/product/test-item");
    await page.getByRole("button", { name: "Weka Kikapuni" }).waitFor();
    assert.equal(await prisma.verificationToken.count(), 0);
    await context.storageState({ path: state.stage + "/buyer-session.json" });
    console.log("PASS OTP UI → API/Auth.js → database consumed token");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
