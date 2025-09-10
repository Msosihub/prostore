import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedPriceTiers() {
  const products = await prisma.product.findMany();

  for (const product of products) {
    const tiers = await prisma.productPricing.findMany({
      where: { productId: product.id },
    });

    if (tiers.length === 0) {
      await prisma.productPricing.createMany({
        data: [
          { productId: product.id, minQty: 1, price: Number(product.price) },
          {
            productId: product.id,
            minQty: 5,
            price: Number(product.price) * 0.95,
          }, // 5% off
          {
            productId: product.id,
            minQty: 20,
            price: Number(product.price) * 0.85,
          }, // 15% off
        ],
      });
      console.log(`✅ Price tiers seeded for ${product.name}`);
    } else {
      console.log(`ℹ️ Skipped ${product.name}, already has tiers`);
    }
  }
}

seedPriceTiers()
  .catch((e) => {
    console.error("❌ PriceTiers seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
