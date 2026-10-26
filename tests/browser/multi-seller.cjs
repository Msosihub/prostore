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
  async function context(storageState) {
    const c = await browser.newContext({
      storageState,
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
    await p.waitForURL((url) => url.pathname === path);
    const session = await (
      await c.request.get(state.baseUrl + "/api/auth/session")
    ).json();
    const expected = await prisma.user.findFirst({ where: { phone } });
    assert.equal(session.user.id, expected.id);
    assert.equal(session.user.role, expected.role);
    return { c, p };
  }
  try {
    const original = await prisma.product.findUnique({
      where: { id: state.fixture.product },
    });
    const seller = await prisma.user.create({
      data: {
        name: "Second Seller",
        phone: "+255700000003",
        role: "SUPPLIER",
        onboarded: true,
      },
    });
    const supplier = await prisma.supplier.create({
      data: {
        userId: seller.id,
        name: "Second Store",
        companyName: "Second Store",
        email: "second@example.test",
        phone: "+255700000003",
      },
    });
    const { id, createdAt, ...base } = original;
    const second = await prisma.product.create({
      data: {
        ...base,
        name: "Second Seller Item",
        slug: "second-seller-item",
        supplierId: supplier.id,
        price: 2000,
        stock: 10,
      },
    });
    const buyer = await context(state.stage + "/buyer-session.json");
    const page = await buyer.newPage();
    page.on("dialog", (d) => d.accept());
    await prisma.cart.deleteMany({ where: { userId: state.fixture.buyer } });
    for (const slug of ["test-item", "second-seller-item"]) {
      await page.goto(state.baseUrl + "/product/" + slug);
      await page.getByRole("button", { name: "Weka Kikapuni" }).click();
      await page
        .getByText("Bidhaa imewekwa kwenye kikapu chako.", { exact: true })
        .waitFor();
    }
    const cart = await prisma.cart.findFirst({
      where: { userId: state.fixture.buyer },
    });
    assert.equal(cart.items.length, 2);
    await page.goto(state.baseUrl + "/shipping-address");
    await page.getByRole("button", { name: "Endelea na Uhakiki" }).click();
    await page.waitForURL("**/place-order");
    const paymentResponse = page.waitForResponse((r) =>
      r.url().endsWith("/api/zenopay/create-payment"),
    );
    await page.getByRole("button", { name: "Agiza Sasa" }).click();
    assert.equal((await paymentResponse).status(), 200);
    await page.waitForURL("**/user/orders");
    const order = await prisma.order.findFirst({
      where: { userId: state.fixture.buyer },
      orderBy: { createdAt: "desc" },
      include: { orderitems: true },
    });
    assert.equal(order.orderitems.length, 2);
    assert.deepEqual(order.orderitems.map((i) => i.supplierName).sort(), [
      "Second Store",
      "Synthetic Store",
    ]);
    assert.equal(order.isPaid, false);
    const vendor = await context(state.stage + "/vendor-session.json");
    const vp = await vendor.newPage();
    vp.on("dialog", (d) => d.accept());
    await vp.goto(
      state.baseUrl + `/supplier/orders/${order.id}?productId=${original.id}`,
    );
    await vp
      .getByRole("heading", { name: "Haujapatikana", exact: true })
      .waitFor();
    assert.equal(await vp.getByText("Test Item", { exact: true }).count(), 0);
    const payments = JSON.parse(
      fs.readFileSync(state.stage + "/payments.json"),
    );
    payments.orders[order.paymentResult.zenopay_order_id].status = "COMPLETED";
    fs.writeFileSync(state.stage + "/payments.json", JSON.stringify(payments));
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await buyer.request.post(state.baseUrl + "/api/zenopay/webhook", {
            data: { order_id: order.paymentResult.zenopay_order_id },
          })
        ).status(),
        200,
      );
    assert.equal(
      await prisma.supplierLedger.count({
        where: { orderId: order.id, type: "ESCROW_CREDIT" },
      }),
      2,
    );
    const oldUser = await prisma.user.findUnique({
      where: { id: state.fixture.buyer },
    });
    await prisma.user.update({
      where: { id: oldUser.id },
      data: {
        address: {
          ...oldUser.address,
          fullName: "Changed profile marker",
          paymentPhone: "private-profile-marker",
        },
      },
    });
    await vp.goto(
      state.baseUrl + `/supplier/orders/${order.id}?productId=${original.id}`,
    );
    await vp.getByText("Test Item", { exact: true }).waitFor();
    let text = await vp.locator("body").innerText();
    assert(!text.includes("Second Seller Item"));
    assert(!text.includes("Changed profile marker"));
    assert(!text.includes("private-profile-marker"));
    await vp.getByRole("button", { name: "Dispatch", exact: true }).click();
    await vp
      .getByRole("dialog")
      .locator("textarea")
      .fill("Manual reference SELLER-A-001");
    await vp.getByRole("button", { name: "Thibitisha Dispatch" }).click();
    await vp.getByRole("dialog").waitFor({ state: "hidden" });
    await vp.reload();
    assert.equal(
      await vp.getByRole("button", { name: "Dispatch", exact: true }).count(),
      0,
    );
    await vp.screenshot({
      path: state.stage + "/multi-seller-supplier-mobile.png",
    });
    await vp.goto(
      state.baseUrl + `/supplier/orders/${order.id}?productId=${second.id}`,
    );
    await vp
      .getByRole("heading", { name: "Haujapatikana", exact: true })
      .waitFor();
    assert.equal(
      await vp.getByText("Second Seller Item", { exact: true }).count(),
      0,
    );
    const vb = await login("+255700000003", "/supplier/orders");
    await vb.p.goto(
      state.baseUrl + `/supplier/orders/${order.id}?productId=${second.id}`,
    );
    await vb.p.getByText("Second Seller Item", { exact: true }).waitFor();
    assert(!(await vb.p.locator("body").innerText()).includes("SELLER-A-001"));
    await vb.p.getByRole("button", { name: "Dispatch", exact: true }).click();
    await vb.p
      .getByRole("dialog")
      .locator("textarea")
      .fill("Manual reference SELLER-B-002");
    await vb.p.getByRole("button", { name: "Thibitisha Dispatch" }).click();
    await vb.p.getByRole("dialog").waitFor({ state: "hidden" });
    await page.goto(state.baseUrl + "/order/" + order.id);
    await page
      .getByText("Manual reference SELLER-A-001", { exact: true })
      .waitFor();
    await page
      .getByText("Manual reference SELLER-B-002", { exact: true })
      .waitFor();
    await page
      .getByRole("button", {
        name: "Nimepokea Bidhaa Hii: Test Item",
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .locator("button:has(svg.lucide-star)")
      .nth(4)
      .click();
    await page
      .getByRole("dialog")
      .locator("textarea")
      .fill("First seller received");
    await page
      .getByRole("button", { name: "Nimepokea Salama", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.reload();
    await page.getByRole("status").filter({ hasText: "1/2" }).waitFor();
    assert.equal(
      (await prisma.order.findUnique({ where: { id: order.id } })).isDelivered,
      false,
    );
    assert.equal(
      Number(
        (await prisma.supplier.findUnique({ where: { id: supplier.id } }))
          .pendingBalance,
      ),
      2000,
    );
    await page.screenshot({
      path: state.stage + "/multi-seller-buyer-mobile.png",
    });
    await page
      .getByRole("button", {
        name: "Nimepokea Bidhaa Hii: Second Seller Item",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Nina tatizo na bidhaa hii" })
      .click();
    await page
      .getByRole("dialog")
      .locator("textarea")
      .fill("Second shipment issue");
    await page.getByRole("button", { name: "Tuma Taarifa kwa Admin" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await prisma.user.create({
      data: {
        name: "Synthetic Admin",
        phone: "+255700000004",
        role: "ADMIN",
        onboarded: true,
      },
    });
    const admin = await login("+255700000004", "/admin/orders");
    await admin.p.goto(state.baseUrl + "/admin/orders/" + order.id);
    await admin.p.getByText("Test Item", { exact: true }).waitFor();
    await admin.p.getByText("Second Seller Item", { exact: true }).waitFor();
    await admin.p
      .getByText("Ombi la tatizo/kurudisha: REQUESTED", { exact: true })
      .waitFor();
    await admin.p
      .getByText("Tatizo lililoripotiwa: Second shipment issue", {
        exact: true,
      })
      .waitFor();
    await admin.p
      .getByText("Tathmini baada ya kupokea: 5/5", { exact: true })
      .waitFor();
    await admin.p.screenshot({
      path: state.stage + "/multi-seller-admin-mobile.png",
    });
    await page.goto(state.baseUrl + "/admin/orders");
    await page.waitForURL("**/unauthorized");
    await prisma.user.update({
      where: { id: oldUser.id },
      data: { address: oldUser.address },
    });
    assert.equal(
      await prisma.supplierLedger.count({
        where: { orderId: order.id, type: "ESCROW_RELEASE" },
      }),
      1,
    );
    assert.equal(
      await prisma.orderItemEvent.count({
        where: { orderId: order.id, type: "DISPATCHED" },
      }),
      2,
    );
    console.log(
      "PASS multi-seller UI cart/checkout → verified mocked payment → isolated seller snapshots/manual dispatch → partial buyer release/dispute → admin report; duplicate callbacks preserve two credits/one release",
    );
  } catch (error) {
    for (let i = 0; i < contexts.length; i++) {
      const p = contexts[i].pages().at(-1);
      if (p) {
        console.log("Failure page", i, p.url());
        await p.screenshot({ path: state.stage + `/multi-failure-${i}.png` });
      }
    }
    throw error;
  } finally {
    for (const c of contexts) await c.close();
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
