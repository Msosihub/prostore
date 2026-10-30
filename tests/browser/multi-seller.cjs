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
      fullPage: true,
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
    await page.goto(state.baseUrl + "/user/orders");
    const ownCard = page
      .locator('a[href="/order/' + order.id + '"]')
      .filter({ hasText: "Zilizopokelewa: 1/2" });
    await ownCard.first().waitFor();
    await page.screenshot({
      path: state.stage + "/buyer-partial-summary-mobile.png",
    });
    await vb.p.goto(state.baseUrl + "/supplier/overview");
    await vb.p
      .getByText("Thamani ya Bidhaa Zilizolipiwa", { exact: true })
      .waitFor();
    const dashboard = await vb.p.locator("main").innerText();
    assert(!dashboard.includes("3121359"));
    assert(!dashboard.includes("Staging Vendor"));
    await vb.p.locator(".recharts-bar-rectangle path").first().waitFor();
    await vb.p.waitForFunction(() => {
      const bar = document.querySelector(".recharts-bar-rectangle path");
      return bar && bar.getBoundingClientRect().height > 10;
    });
    await vb.p.screenshot({
      path: state.stage + "/seller-summary-mobile.png",
      fullPage: true,
    });
    assert.equal(
      (
        await buyer.request.get(state.baseUrl + "/api/admin/dashboard")
      ).status(),
      403,
    );
    await prisma.user.update({
      where: { id: seller.id },
      data: { role: "BUYER" },
    });
    await vb.p.reload();
    await vb.p.waitForURL(url => url.pathname === "/unauthorized");
    assert.equal(
      await vb.p.getByText("Escrow Pending", { exact: true }).count(),
      0,
    );
    await admin.p.goto(
      state.baseUrl + "/admin/payments?status=SETTLED&page=99",
    );
    await admin.p
      .getByRole("heading", { name: "Payment recovery", exact: true })
      .waitFor();
    await admin.p.getByText("Page 1 of 1", { exact: false }).waitFor();
    const selectedAttempt = await prisma.paymentAttempt.findUniqueOrThrow({ where: { orderId: order.id } });
    await admin.p.locator(`a[href="/admin/payments/${selectedAttempt.id}"]`).click();
    await admin.p
      .getByRole("heading", { name: "Payment attempt", exact: true })
      .waitFor();
    await admin.p
      .getByRole("button", { name: "Check existing payment", exact: true })
      .click();
    await admin.p
      .getByText("Payment confirmed and order recorded.", { exact: true })
      .waitFor();
    assert.equal(
      await admin.p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await admin.p
      .locator("#admin-content").filter({ visible: true })
      .screenshot({ path: state.stage + "/payment-recovery-mobile.png" });
    await admin.p.goto(state.baseUrl + "/admin");
    await admin.p.getByRole("heading", { name: "Operations overview" }).waitFor();
    assert.equal(await admin.p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await admin.p.locator("#admin-content").filter({ visible: true }).screenshot({ path: state.stage + "/admin-operations-mobile.png" });
    await admin.p.setViewportSize({ width: 1280, height: 900 });
    await admin.p.locator("#admin-content").filter({ visible: true }).screenshot({ path: state.stage + "/admin-operations-desktop.png" });
    await admin.p.getByRole("link", { name: "Orders", exact: true }).click();
    await admin.p.getByLabel("Product name or full order ID").filter({ visible: true }).fill(order.id);
    await admin.p.getByLabel("Payment / fulfillment").filter({ visible: true }).selectOption("paid");
    await Promise.all([
      admin.p.waitForURL(u => u.pathname === "/admin/orders" && u.searchParams.get("q") === order.id && u.searchParams.get("status") === "paid", {waitUntil:"domcontentloaded"}),
      admin.p.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await admin.p.getByRole("link", { name: "Order #" + order.id.slice(0, 8), exact: true }).waitFor();
    await admin.p.getByLabel("Product name or full order ID").filter({ visible: true }).fill("missing-admin-synthetic");
    assert.equal(await admin.p.getByLabel("Product name or full order ID").filter({visible:true}).inputValue(),"missing-admin-synthetic");
    await Promise.all([
      admin.p.waitForURL(u => u.pathname === "/admin/orders" && u.searchParams.get("q") === "missing-admin-synthetic", {waitUntil:"domcontentloaded"}),
      admin.p.getByRole("button", { name: "Apply filters" }).click(),
    ]);
    await admin.p.getByRole("status").getByText("No orders match these filters.").waitFor();
    await admin.p.getByRole("link", { name: "Disputes", exact: true }).click();
    await admin.p.getByRole("heading", { name: "Disputes and returns" }).waitFor();
    await admin.p.getByRole("link", { name: "Review order #" + order.id.slice(0, 8) }).waitFor();
    await admin.p.locator("#admin-content").filter({ visible: true }).screenshot({ path: state.stage + "/admin-disputes-desktop.png" });
    assert.equal((await buyer.request.post(state.baseUrl + "/api/admin/brands", { data: { name: "blocked" } })).status(), 403);
    console.log("PASS admin overview/mobile layout, canonical order filtering/empty recovery, dispute queue and buyer mutation denial");
    const documentProduct = await prisma.product.findUnique({ where: { id: state.fixture.product } });
    const document = await prisma.supplierDocument.create({ data: { supplierId: documentProduct.supplierId, label: "Synthetic review package", name: "Demo", type: "License", description: "Review both demo pages", fileUrl: "https://example.test/one", files: ["https://example.test/one", "https://example.test/two"] } });
    await prisma.supplierDocument.create({ data: { supplierId: documentProduct.supplierId, label: "Rejected demo package", name: "Demo", fileUrl: "", rejectionReason: "Synthetic rejection" } });
    await admin.p.getByRole("link", { name: "Documents", exact: true }).click();
    await admin.p.getByText("Synthetic review package", { exact: false }).waitFor();
    assert.equal(await admin.p.getByText("Rejected demo package", { exact: false }).count(), 0);
    assert.equal(await admin.p.getByRole("link", { name: /Open attachment/ }).count(), 2);
    await admin.p.getByText("Review both demo pages", { exact: true }).waitFor();
    await admin.p.getByRole("button", { name: "Approve document", exact: true }).click();
    await admin.p.getByRole("status").getByText("No documents match these filters.").waitFor();
    assert.equal((await prisma.supplierDocument.findUnique({ where: { id: document.id } })).verified, true);
    assert.equal(await prisma.auditLog.count({ where: { entityId: document.id, action: "DOCUMENT_APPROVED" } }), 1);
    await admin.p.getByLabel("Document status").filter({ visible: true }).selectOption("rejected");
    await admin.p.getByRole("button", { name: "Apply filters" }).click();
    await admin.p.getByText("Rejected demo package", { exact: false }).waitFor();
    console.log("PASS admin document pending/rejected filters, multiple attachments and confirmed decision with persisted audit");
    const queuedSms = await prisma.orderNotification.findFirst({where:{orderId:order.id,state:"QUEUED"}});
    assert(queuedSms);
    await prisma.orderNotification.update({where:{id:queuedSms.id},data:{state:"UNKNOWN",attempts:1,reason:"SYNTHETIC_TIMEOUT"}});
    await admin.p.goto(state.baseUrl+"/admin/notifications?status=UNKNOWN");
    await admin.p.getByRole("heading",{name:"Order notification outbox",exact:true}).waitFor();
    assert(await admin.p.getByRole("button",{name:"Queue reviewed retry"}).isDisabled());
    await admin.p.getByRole("checkbox").check();
    const refreshedNotificationPage = admin.p.waitForRequest(request => request.method() === "GET" && request.isNavigationRequest() && new URL(request.url()).pathname === "/admin/notifications" && new URL(request.url()).searchParams.get("status") === "UNKNOWN");
    await admin.p.getByRole("button",{name:"Queue reviewed retry"}).click();
    await refreshedNotificationPage;
    await admin.p.getByRole("status").getByText("No matching notifications.",{exact:true}).waitFor();
    assert.equal((await prisma.orderNotification.findUnique({where:{id:queuedSms.id}})).state,"QUEUED");
    await admin.p.setViewportSize({width:390,height:844});
    await admin.p.goto(state.baseUrl+"/admin/notifications?q="+order.id);
    await admin.p.getByRole("heading",{name:"Order notification outbox",exact:true}).waitFor();
    assert.equal(await admin.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await admin.p.locator("#admin-content").filter({ visible: true }).screenshot({path:state.stage+"/order-notifications-mobile.png"});
    await page.goto(state.baseUrl+"/user/notifications");
    await page.getByRole("checkbox",{name:"Receive transactional order SMS"}).uncheck();
    await page.getByRole("button",{name:"Save SMS preference"}).click();
    await page.getByRole("status").getByText("Order SMS disabled.",{exact:false}).waitFor();
    assert.equal((await prisma.user.findUnique({where:{id:state.fixture.buyer}})).orderSmsEnabled,false);
    await page.getByRole("checkbox",{name:"Receive transactional order SMS"}).check();
    await page.getByRole("button",{name:"Save SMS preference"}).click();
    await page.getByRole("status").getByText("Order SMS enabled.",{exact:false}).waitFor();
    console.log("PASS admin outbox unknown acknowledgement/requeue without sends, mobile layout, buyer SMS opt-out/opt-in persistence");
    await vp.goto(state.baseUrl + "/supplier/withdrawals");
    await vp.getByLabel("Amount (TZS)").filter({ visible: true }).fill("100.00");
    await vp.getByLabel("Reason (no bank details or private contact information)").filter({ visible: true }).fill("Synthetic seller withdrawal review");
    await vp.getByRole("checkbox").check();
    let droppedMoneyResponse = false;
    const dropMoneyResponse = async route => {
      if (!droppedMoneyResponse && route.request().method() === "POST" && route.request().headers()["next-action"]) {
        droppedMoneyResponse = true; await route.fetch(); await route.abort("failed");
      } else await route.continue();
    };
    await vp.route("**/supplier/withdrawals", dropMoneyResponse);
    await vp.getByRole("button", {name:"Submit review request"}).click();
    await vp.getByRole("status").getByText("Connection interrupted.",{exact:false}).waitFor();
    assert(droppedMoneyResponse); assert.equal(await prisma.moneyReviewCase.count({where:{kind:"WITHDRAWAL"}}),1);
    await vp.unroute("**/supplier/withdrawals", dropMoneyResponse);
    await vp.reload();
    await vp.getByLabel("Amount (TZS)").filter({ visible: true }).fill("100.00");
    await vp.getByLabel("Reason (no bank details or private contact information)").filter({ visible: true }).fill("Synthetic seller withdrawal review");
    await vp.getByRole("checkbox").check();
    await vp.getByRole("button", {name:"Submit review request"}).click();
    await vp.getByRole("status").getByText("Review case saved.",{exact:false}).waitFor();
    const withdrawalCase = await prisma.moneyReviewCase.findFirst({where:{kind:"WITHDRAWAL"}});
    assert(withdrawalCase); assert.equal(withdrawalCase.amount.toString(),"100");
    assert.equal(await prisma.moneyReviewCase.count({where:{kind:"WITHDRAWAL"}}),1);
    assert.equal(await prisma.moneyReviewEvent.count({where:{caseId:withdrawalCase.id}}),1);
    console.log("PASS lost withdrawal response → reload → unchanged retry preserves one request/hold/audit event");
    assert.equal(await vp.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await vp.locator("section").filter({visible:true}).filter({has:vp.getByRole("heading",{name:"Withdrawal reviews",exact:true})}).screenshot({path:state.stage+"/withdrawals-mobile.png"});
    await vb.p.goto(state.baseUrl + "/supplier/withdrawals/" + withdrawalCase.id);
    assert(!(await vb.p.locator("body").innerText()).includes("Synthetic seller withdrawal review"));
    await admin.p.goto(state.baseUrl + "/admin/money-review/" + withdrawalCase.id);
    await admin.p.getByLabel("Decision",{exact:true}).filter({ visible: true }).selectOption("APPROVED");
    await admin.p.getByLabel("Decision reason").filter({ visible: true }).fill("Synthetic approval retains hold only");
    await admin.p.getByRole("checkbox").check();
    await admin.p.getByRole("button",{name:"Save decision"}).click();
    await admin.p.getByRole("status").getByText("Review case saved.",{exact:false}).waitFor();
    assert.equal((await prisma.moneyReviewCase.findUnique({where:{id:withdrawalCase.id}})).state,"APPROVED");
    await page.goto(state.baseUrl+"/user/refunds");
    await page.getByLabel("Paid order item").filter({ visible: true }).selectOption(order.id+":"+original.id);
    await page.getByLabel("Quantity for review").filter({ visible: true }).fill("1");
    await page.getByLabel("Reason (no bank details or private contact information)").filter({ visible: true }).fill("Synthetic delivered item refund review");
    await page.getByRole("checkbox").check();
    await page.getByRole("button",{name:"Submit review request"}).click();
    await page.getByRole("status").getByText("Review case saved.",{exact:false}).waitFor();
    const refundCase = await prisma.moneyReviewCase.findFirst({where:{kind:"REFUND"}});
    assert(refundCase); assert.equal(refundCase.orderId,order.id);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator("section").filter({visible:true}).filter({has:page.getByRole("heading",{name:"Refund reviews",exact:true})}).screenshot({path:state.stage+"/refunds-mobile.png"});
    await admin.p.goto(state.baseUrl+"/admin/money-review/"+refundCase.id);
    assert.equal(await admin.p.locator('option[value="APPROVED"]').count(),0);
    await admin.p.getByLabel("Decision",{exact:true}).filter({ visible: true }).selectOption("UNDER_REVIEW");
    await admin.p.getByLabel("Decision reason").filter({ visible: true }).fill("Synthetic allocation review required");
    await admin.p.getByRole("checkbox").check();
    await admin.p.getByRole("button",{name:"Save decision"}).click();
    await admin.p.getByRole("status").getByText("Review case saved.",{exact:false}).waitFor();
    assert.equal(await admin.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await admin.p.locator("#admin-content").filter({ visible: true }).screenshot({path:state.stage+"/money-review-admin-mobile.png"});
    await vp.goto(state.baseUrl+"/supplier/withdrawals/"+withdrawalCase.id);
    await vp.getByLabel("Decision reason").filter({ visible: true }).fill("Synthetic seller cancels reservation");
    await vp.getByRole("checkbox").check();
    await vp.getByRole("button",{name:"Save decision"}).click();
    await vp.getByText("CANCELLED",{exact:true}).first().waitFor();
    assert.equal((await prisma.moneyReviewCase.findUnique({where:{id:withdrawalCase.id}})).state,"CANCELLED");
    assert.equal(await prisma.supplierLedger.count({where:{type:{in:["PAYOUT","REFUND"]}}}),0);
    console.log("PASS seller withdrawal reservation/admin review/owner cancellation, cross-seller detail isolation, buyer delivered-item refund review with execution gated, mobile layouts; no money movement");
    const adminUser = await prisma.user.findFirst({
      where: { phone: "+255700000004" },
    });
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: "BUYER" },
    });
    assert.equal(
      (
        await admin.c.request.get(state.baseUrl + "/api/admin/dashboard")
      ).status(),
      403,
    );
    for (const endpoint of ["brands", "banners", "banner-items"]) {
      assert.equal((await admin.c.request.post(state.baseUrl + "/api/admin/" + endpoint, { data: {} })).status(), 403);
    }
    await admin.p.goto(state.baseUrl + "/admin/orders");
    await admin.p.waitForURL((url) => url.pathname === "/unauthorized");
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
