import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = "12345";

  // --- Brands ---
  const [brandA, brandB] = await Promise.all([
    prisma.brand.create({ data: { name: "Acme Brand" } }),
    prisma.brand.create({ data: { name: "Global Goods" } }),
  ]);

  // --- Categories + Subcategories ---
  const electronics = await prisma.category.create({
    data: {
      name_en: "Electronics",
      name_sw: "Umeme",
      subcategories: {
        create: [
          { name_en: "Phones", name_sw: "Simu" },
          { name_en: "Laptops", name_sw: "Kompyuta" },
        ],
      },
    },
    include: { subcategories: true },
  });

  const fashion = await prisma.category.create({
    data: {
      name_en: "Fashion",
      name_sw: "Mitindo",
      subcategories: {
        create: [
          { name_en: "Shoes", name_sw: "Viatu" },
          { name_en: "Clothing", name_sw: "Nguo" },
        ],
      },
    },
    include: { subcategories: true },
  });

  // --- Buyer (for reviews & chats) ---
  const buyer = await prisma.user.create({
    data: {
      name: "John Buyer",
      email: "buyer@test.com",
      password: hashedPassword,
      role: "BUYER",
    },
  });

  // --- Suppliers + Users ---
  const suppliers = [];
  for (let i = 1; i <= 4; i++) {
    const user = await prisma.user.create({
      data: {
        name: `Supplier User ${i}`,
        email: `supplier${i}@test.com`,
        password: hashedPassword,
        role: "SUPPLIER",
      },
    });

    const supplier = await prisma.supplier.create({
      data: {
        userId: user.id,
        name: `Supplier ${i}`,
        email: `supplier${i}@test.com`,
        phone: `+255700000${i}`,
        companyName: `Company ${i}`,
        location: "Dar es Salaam",
        nation: "TZ",
        yearsActive: 2,
      },
    });

    suppliers.push({ supplier, user });
  }

  // --- Products + Reviews ---
  for (let i = 0; i < suppliers.length; i++) {
    const supplier = suppliers[i].supplier;
    for (let j = 1; j <= 4; j++) {
      const category = i % 2 === 0 ? electronics : fashion;
      const sub = category.subcategories[j % category.subcategories.length];

      const product = await prisma.product.create({
        data: {
          name: `Product ${j} of ${supplier.name}`,
          slug: `product-${i + 1}-${j}`,
          description: `Description for product ${j} of ${supplier.name}`,
          images: [`/images/product-${i + 1}-${j}.jpg`],
          price: 100 + j * 5,
          stock: 50,
          supplierId: supplier.id,
          brandId: i % 2 === 0 ? brandA.id : brandB.id,
          categoryId: category.id,
          subcategoryId: sub.id,
          pricingTiers: {
            create: [
              { minQty: 1, price: 100 + j * 5 },
              { minQty: 10, price: 95 + j * 5 },
            ],
          },
        },
      });

      // Reviews
      await prisma.review.createMany({
        data: [
          {
            userId: buyer.id,
            productId: product.id,
            rating: 5,
            title: "sample title",
            description: `Absolutely love this ${product.name}, quality is excellent!`,
          },
          {
            userId: buyer.id,
            productId: product.id,
            rating: 4,
            title: "sample title",
            description: `Good ${product.name}, but delivery could be faster.`,
          },
        ],
      });
    }
  }

  // --- Conversations + Messages (Alibaba-style chat) ---
  for (let i = 0; i < suppliers.length; i++) {
    const supplierUser = suppliers[i].user;

    const conversation = await prisma.conversation.create({
      data: {
        buyerId: buyer.id,
        supplierId: supplierUser.id,
      },
    });

    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderId: buyer.id,
          body: "Hello, I am interested in your products.",
        },
        {
          conversationId: conversation.id,
          senderId: supplierUser.id,
          body: "Welcome! Which product are you looking at?",
        },
        {
          conversationId: conversation.id,
          senderId: buyer.id,
          body: "The price for bulk orders looks good, do you offer discounts?",
        },
        {
          conversationId: conversation.id,
          senderId: supplierUser.id,
          body: "Yes, we can give special pricing for 100+ units.",
        },
      ],
    });
  }

  console.log(
    "✅ Full seed with brands, categories, suppliers, products, reviews & chats created!"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
