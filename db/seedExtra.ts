import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding extra data...");

  const suppliers = await prisma.supplier.findMany({
    include: { products: true },
  });
  const buyers = await prisma.user.findMany({ where: { role: "BUYER" } });

  if (suppliers.length === 0 || buyers.length === 0) {
    throw new Error("Suppliers or buyers are missing. Run main seeder first.");
  }

  for (const buyer of buyers) {
    for (const supplier of suppliers) {
      const product = faker.helpers.arrayElement(supplier.products);
      if (!product) continue;

      // Check if conversation exists
      let conversation = await prisma.conversation.findFirst({
        where: { buyerId: buyer.id, supplierId: supplier.userId },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            buyerId: buyer.id,
            supplierId: supplier.userId,
            productId: product.id,
          },
        });
      }

      // Messages
      const messagesCount = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < messagesCount; i++) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: faker.helpers.arrayElement([buyer.id, supplier.userId]),
            content: faker.lorem.sentence(),
            seen: faker.datatype.boolean(),
          },
        });
      }

      // Reviews
      if (faker.datatype.boolean()) {
        await prisma.review.create({
          data: {
            userId: buyer.id,
            productId: product.id,
            rating: faker.number.int({ min: 3, max: 5 }),
            title: faker.commerce.productName(),
            description: faker.lorem.sentences(2),
            isVerifiedPurchase: true,
          },
        });
      }

      // Orders
      if (faker.datatype.boolean()) {
        const qty = faker.number.int({ min: 1, max: 5 });
        const price = Number(product.price);

        await prisma.order.create({
          data: {
            userId: buyer.id,
            shippingAddress: {
              street: faker.location.streetAddress(),
              city: faker.location.city(),
              country: faker.location.country(),
              zip: faker.location.zipCode(),
            },
            paymentMethod: "Cash on Delivery",
            itemsPrice: price * qty,
            shippingPrice: faker.number.int({ min: 5, max: 20 }),
            taxPrice: faker.number.int({ min: 1, max: 10 }),
            totalPrice: price * qty + 10,
            isPaid: faker.datatype.boolean(),
            isDelivered: faker.datatype.boolean(),
            orderitems: {
              create: [
                {
                  productId: product.id,
                  qty,
                  price,
                  name: product.name,
                  slug: product.slug,
                  image: product.images[0],
                },
              ],
            },
          },
        });
      }
    }
  }

  console.log("Extra test data seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
