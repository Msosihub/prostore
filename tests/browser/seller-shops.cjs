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
  const contexts = [];
  let page;
  async function context() {
    const c = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    contexts.push(c);
    await c.route("**/*", (r) =>
      new URL(r.request().url()).hostname === "127.0.0.1"
        ? r.continue()
        : r.abort(),
    );
    return c;
  }
  async function login(phone, path) {
    const c = await context();
    const p = await c.newPage();
    p.setDefaultTimeout(60000);
    p.on("dialog", (d) => d.accept());
    await p.goto(state.baseUrl + "/sign-in?callbackUrl=" + path);
    await p.locator("#identifier").fill(phone);
    await p.getByRole("button", { name: "Tuma Msimbo wa OTP" }).click();
    await p.locator("#otp").waitFor();
    const otp = await prisma.verificationToken.findFirst({
      where: { identifier: phone },
    });
    await p.locator("#otp").fill(otp.token);
    await p
      .getByRole("button", { name: "Thibitisha na Uingie Sokoni" })
      .click();
    await p.waitForURL((u) => u.pathname === path);
    return { c, p };
  }
  try {
    const visitor = await context();
    page = await visitor.newPage();
    await page.goto(state.baseUrl + "/sell");
    await page
      .getByRole("heading", { name: "Bring your customers to Nimboya." })
      .waitFor();
    assert.equal(
      await page.locator("link[rel=canonical]").getAttribute("href"),
      (state.publicOrigin || state.baseUrl) + "/sell",
    );
    assert(
      (
        await page
          .locator('script[type="application/ld+json"]')
          .allTextContents()
      ).some((x) => x.includes("BreadcrumbList")),
    );
    await page.screenshot({
      path: state.stage + "/seller-registration-mobile.png",
      fullPage: true,
    });
    const phone = "+255700000041";
    const seller = await login(phone, "/sell");
    page = seller.p;
    await page
      .getByLabel("Business name", { exact: true })
      .fill("Demo Household Studio");
    await page
      .getByLabel("Your shop link", { exact: false })
      .fill("demo-household-studio");
    await page
      .getByLabel("What do you sell?", { exact: false })
      .fill("Everyday kitchen and household products.");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Submit seller application" })
      .click();
    await page.getByRole("region", { name: "Seller application", exact: true }).filter({ visible: true }).getByText("PENDING", { exact: true }).waitFor();
    const owner = await prisma.user.findUnique({ where: { phone } });
    const shop = await prisma.supplier.findUnique({
      where: { userId: owner.id },
    });
    assert(shop);
    assert.equal(
      await prisma.sellerRegistration.count({ where: { supplierId: shop.id } }),
      1,
    );
    await page.reload();
    await page.getByRole("region", { name: "Seller application", exact: true }).filter({ visible: true }).getByText("PENDING", { exact: true }).waitFor();
    assert.equal(
      await prisma.sellerNotice.count({
        where: { registration: { supplierId: shop.id } },
      }),
      1,
    );
    {
      const response = await visitor.request.get(
        state.baseUrl + "/shops/demo-household-studio",
      );
      const body = await response.text();
      // Next may already have streamed the shell (HTTP200) before notFound().
      assert([200, 404].includes(response.status()));
      assert(body.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
      assert(body.includes("noindex"));
      assert(!body.includes("Demo Household Studio"));
      assert(!body.includes("Demo Shop Kettle"));
    }
    const original = await prisma.product.findUnique({
      where: { id: state.fixture.product },
    });
    const { id, createdAt, updatedAt, ...template } = original;
    const product = await prisma.product.create({
      data: {
        ...template,
        name: "Demo Shop Kettle",
        slug: "demo-shop-kettle",
        supplierId: shop.id,
      },
    });
    await page.goto(state.baseUrl + "/search?q=Demo%20Shop%20Kettle");
    assert.equal(
      await page
        .getByRole("link", { name: "Demo Shop Kettle", exact: true })
        .count(),
      0,
    );
    await prisma.user.create({
      data: {
        name: "Demo application reviewer",
        phone: "+255700000042",
        role: "ADMIN",
      },
    });
    const admin = await login("+255700000042", "/admin/seller-applications");
    await admin.p
      .getByRole("heading", { name: "Demo Household Studio" })
      .waitFor();
    await admin.p
      .getByLabel("Reason shared with applicant")
      .fill("Synthetic profile checked for browser QA.");
    await admin.p.getByRole("button", { name: "Record review" }).click();
    await admin.p.getByText("No applications in this view.").waitFor();
    assert.equal(
      (await prisma.supplier.findUnique({ where: { id: shop.id } })).isVerified,
      true,
    );
    await page.goto(state.baseUrl + "/sell");
    await page.getByRole("region", { name: "Seller application", exact: true }).filter({ visible: true }).getByText("APPROVED", { exact: true }).waitFor();
    await page.getByRole("link", { name: "View public shop" }).click();
    await page.waitForURL("**/shops/demo-household-studio");
    await page
      .getByRole("heading", { name: "Demo Household Studio" })
      .waitFor();
    await page.getByText("Demo Shop Kettle", { exact: true }).first().waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: state.stage + "/seller-shop-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: state.stage + "/seller-shop-desktop.png",
      fullPage: true,
    });
    const html = await (
      await visitor.request.get(state.baseUrl + "/shops/demo-household-studio")
    ).text();
    assert(!html.includes(phone));
    assert(!html.includes("@seller.invalid"));
    assert(!html.includes("phoneDigest"));
    assert(html.includes("BreadcrumbList"));
    assert(html.includes("og:url"));
    await page.goto(state.baseUrl + "/company/" + shop.id + "/home");
    await page.waitForURL("**/shops/demo-household-studio");
    await page.goto(
      state.baseUrl + "/shops/demo-household-studio?q=absent&q=other",
    );
    await page
      .getByRole("heading", { name: "No products in this view" })
      .waitFor();
    const saved = await seller.c.request.put(
      state.baseUrl + "/api/suppliers/me",
      {
        data: {
          name: "Demo Household Studio",
          about: "Updated household catalog",
          businessHours: [{ day: "Monday", open: "09:00", close: "17:00" }],
        },
      },
    );
    assert.equal(saved.status(), 200);
    assert.equal(
      (
        await seller.c.request.put(state.baseUrl + "/api/suppliers/me", {
          data: { username: "hijacked-shop" },
        })
      ).status(),
      400,
    );
    await page.goto(state.baseUrl + "/shops/demo-household-studio");
    await page
      .getByText("Updated household catalog", { exact: true })
      .waitFor();
    await page
      .getByRole("link", { name: "Demo Shop Kettle", exact: true })
      .first()
      .click();
    await page.waitForURL("**/product/demo-shop-kettle");
    await page.getByRole("link", { name: "Visit seller shop" }).waitFor();
    await admin.p.goto(
      state.baseUrl + "/admin/seller-applications?state=APPROVED",
    );
    await admin.p
      .locator("#admin-content")
      .screenshot({
        path: state.stage + "/seller-application-admin-mobile.png",
      });
    const reviewedCard = admin.p.getByRole("article").filter({
      has: admin.p.getByRole("heading", { name: "Demo Household Studio", exact: true }),
    }).filter({ visible: true });
    await reviewedCard.getByLabel("Decision", { exact: true }).selectOption("REJECTED");
    await reviewedCard.getByLabel("Reason shared with applicant").fill("Synthetic revocation test.");
    await reviewedCard.getByRole("button", { name: "Record review" }).click();
    await reviewedCard.waitFor({ state: "hidden" });
    assert.equal((await prisma.sellerRegistration.findUnique({where:{supplierId:shop.id}})).state,"REJECTED");
    if (state.fixture.transferred) {
      assert.equal((await prisma.sellerRegistration.findUnique({where:{supplierId:state.fixture.supplier}})).state,"APPROVED");
      assert.equal((await prisma.supplier.findUnique({where:{id:state.fixture.supplier}})).isVerified,true);
    }
    {
      const response = await visitor.request.get(
        state.baseUrl + "/shops/demo-household-studio",
      );
      const body = await response.text();
      // Next may already have streamed the shell (HTTP200) before notFound().
      assert([200, 404].includes(response.status()));
      assert(body.includes("NEXT_HTTP_ERROR_FALLBACK;404"));
      assert(body.includes("noindex"));
      assert(!body.includes("Demo Household Studio"));
      assert(!body.includes("Demo Shop Kettle"));
    }
    assert.equal(
      await prisma.sellerNotice.count({
        where: { registration: { supplierId: shop.id } },
      }),
      3,
    );
    assert.equal(
      await prisma.sellerNotice.count({
        where: { state: "ACCEPTED", registration: { supplierId: shop.id } },
      }),
      0,
    );
    await prisma.product.delete({ where: { id: product.id } });
    console.log(
      "PASS verified-phone application/reload, pending product isolation, manual approval and consented notice dedupe, private shop DTO/canonical/breadcrumbs, profile save/stable link, product navigation, revocation, desktop/mobile QA; no real notices",
    );
  } catch (e) {
    if (page)
      await page.screenshot({
        path: state.stage + "/seller-flow-failure.png",
        fullPage: true,
      });
    throw e;
  } finally {
    for (const c of contexts) await c.close();
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
