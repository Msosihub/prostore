import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // --- ADMIN USER ---
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin2@example.com",
      role: "ADMIN",
      isVerified: true,
    },
  });

  // --- BUYER USER ---
  const buyer = await prisma.user.create({
    data: {
      name: "John Buyer",
      email: "buyer2@example.com",
      role: "BUYER",
      isVerified: true,
    },
  });

  // --- Create multiple suppliers ---
  const suppliersData = [
    {
      user: { name: "Jane Supplier", email: "supplier@example.com" },
      supplier: {
        name: "Pro Supplier Ltd",
        email: "supplier@example.com",
        tagLine: "Ubora wa bidhaa zetu ndio kipaumbele chetu",
        description: "Tunauza vifaa vya umeme na vifaa vya nyumbani",
        phone: "+255754465678",
        location: "Dar es Salaam, Tanzania",
        nation: "Tanzania",
        yearsActive: 5,
        rating: 4.5,
      },
    },
    {
      user: { name: "Alpha Supplier", email: "alpha@supplier.com" },
      supplier: {
        name: "Alpha Electronics",
        email: "alpha@supplier.com",
        tagLine: "Huduma ya haraka na bidhaa bora",
        description: "Bidhaa za kielektroniki kwa bei nafuu",
        phone: "+255754465679",
        location: "Arusha, Tanzania",
        nation: "Tanzania",
        yearsActive: 3,
        rating: 4.2,
      },
    },
    {
      user: { name: "Beta Supplier", email: "beta@supplier.com" },
      supplier: {
        name: "Beta Traders",
        email: "beta@supplier.com",
        tagLine: "Tunakuletea bidhaa kwa wakati",
        description: "Biashara ya jumla ya vifaa vya ujenzi na umeme",
        phone: "+255754465629",
        location: "Mwanza, Tanzania",
        nation: "Tanzania",
        yearsActive: 4,
        rating: 4.0,
      },
    },
    {
      user: { name: "Gamma Supplier", email: "gamma@supplier.com" },
      supplier: {
        name: "Gamma Supplies",
        email: "gamma@supplier.com",
        tagLine: "Kila kitu unachohitaji, kwa ubora",
        description: "Bidhaa za matumizi ya nyumbani na biashara",
        phone: "+255754445679",
        location: "Dodoma, Tanzania",
        nation: "Tanzania",
        yearsActive: 2,
        rating: 3.9,
      },
    },
  ];

  const suppliers: any[] = [];
  for (const s of suppliersData) {
    const user = await prisma.user.create({
      data: {
        name: s.user.name,
        email: s.user.email,
        role: "SUPPLIER",
        isVerified: true,
      },
    });

    const supplier = await prisma.supplier.create({
      data: {
        ...s.supplier,
        userId: user.id,
        isVerified: true,
      },
    });

    suppliers.push(supplier);

    // Certifications
    for (let i = 1; i <= 3; i++) {
      await prisma.certification.create({
        data: {
          supplierId: supplier.id,
          image: `/images/certs/${faker.number.int({ min: 1, max: 4 })}.jpg`,
          label: `Cheti cha ubora ${i}`,
          certNumber: `CERT-${i}${faker.string.alphanumeric(5)}`,
          validUntil: faker.date.future(),
        },
      });
    }
  }

  // --- BRANDS ---
  const brand = await prisma.brand.create({
    data: {
      name: "BrandOne",
      description: "A sample brand",
    },
  });

  // --- CATEGORY + SUBCATEGORIES ---
  const category = await prisma.category.create({
    data: {
      name_en: "Electronics",
      name_sw: "Vifaa vya umeme",
      description: "Electronics category",
      subcategories: {
        create: [
          { name_en: "Phones", name_sw: "Simu" },
          { name_en: "Laptops", name_sw: "Kompyuta" },
          { name_en: "TVs", name_sw: "Runinga" },
        ],
      },
    },
    include: { subcategories: true },
  });

  // --- PRODUCTS ---
  let productIndex = 1;
  for (const supplier of suppliers) {
    for (let i = 0; i < 4; i++) {
      const subcat = category.subcategories[i % category.subcategories.length];

      const product = await prisma.product.create({
        data: {
          name: `Bidhaa ${productIndex}`,
          slug: `bidhaa-${productIndex}`,
          description: faker.commerce.productDescription(),
          images: [
            `/images/sample-products/p${(productIndex % 6) + 1}-1.jpg`,
            `/images/sample-products/p${(productIndex % 6) + 1}-2.jpg`,
          ],
          thumbnail: `/images/sample-products/p${(productIndex % 6) + 1}-1.jpg`,
          price: faker.number.int({ min: 10000, max: 200000 }),
          stock: faker.number.int({ min: 5, max: 150 }),
          supplierId: supplier.id,
          brandId: brand.id,
          categoryId: category.id,
          subcategoryId: subcat.id,
        },
      });

      // --- Pricing Tiers ---
      await prisma.productPricing.createMany({
        data: [
          { productId: product.id, minQty: 1, price: product.price },
          {
            productId: product.id,
            minQty: 5,
            price: product.price.mul(0.95),
          },
          {
            productId: product.id,
            minQty: 20,
            price: product.price.mul(0.9),
          },
        ],
      });

      // --- Reviews ---
      for (let r = 0; r < 3; r++) {
        await prisma.review.create({
          data: {
            userId: buyer.id,
            productId: product.id,
            rating: faker.number.int({ min: 3, max: 5 }),
            title: faker.lorem.words(3),
            description: faker.helpers.arrayElement([
              "Bidhaa hii imenisaidia sana!",
              "Ubora wa hali ya juu, napendekeza.",
              "Bei ni nafuu na huduma nzuri.",
              "Nimeridhika na huduma ya muuzaji.",
            ]),
            isVerifiedPurchase: true,
          },
        });
      }

      productIndex++;
    }
  }

  console.log("✅ Seeding finished.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
