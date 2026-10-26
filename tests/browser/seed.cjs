const fs = require("fs");
const state = JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));
Object.assign(process.env, state.env);
(async () => {
  const db = require(state.stage + "/tests/integration/database.cjs");
  await db.prepare();
  const f = await db.fixture({ stock: 30, qty: 2 });
  await db.prisma.orderItem.deleteMany({ where: { orderId: f.order.id } });
  await db.prisma.order.delete({ where: { id: f.order.id } });
  const address = {
    fullName: "Staging Buyer",
    streetAddress: "Synthetic street",
    city: "Dar",
    postalCode: "12345",
    country: "Tanzania",
    phone: "+255700000000",
    paymentPhone: "+255700000000",
  };
  await db.prisma.user.update({
    where: { id: f.user.id },
    data: { role: "BUYER", onboarded: true, address, paymentMethod: "Mobile" },
  });
  const vendor = await db.prisma.user.create({
    data: {
      name: "Staging Vendor",
      phone: "+255700000002",
      role: "SUPPLIER",
      onboarded: true,
    },
  });
  await db.prisma.supplier.update({
    where: { id: f.supplier.id },
    data: { userId: vendor.id, companyName: "Synthetic Store" },
  });
  await db.prisma.product.update({
    where: { id: f.product.id },
    data: { images: ["/images/logo.svg"] },
  });
  await db.prisma.productPricing.create({
    data: { productId: f.product.id, minQty: 5, price: 800 },
  });
  state.fixture = {
    buyer: f.user.id,
    vendor: vendor.id,
    supplier: f.supplier.id,
    product: f.product.id,
  };
  fs.writeFileSync(process.env.PROSTORE_BROWSER_STATE, JSON.stringify(state));
  await db.prisma.$disconnect();
  console.log("Synthetic fixture seeded");
})();
