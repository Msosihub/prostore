import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // --- USERS ---
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
      isVerified: true,
    },
  });

  const buyer = await prisma.user.create({
    data: {
      name: "John Buyer",
      email: "buyer@example.com",
      role: "BUYER",
    },
  });

  const supplierUser = await prisma.user.create({
    data: {
      name: "Jane Supplier",
      email: "supplier@example.com",
      role: "SUPPLIER",
    },
  });

  // --- SUPPLIER ---
  const supplier = await prisma.supplier.create({
    data: {
      userId: supplierUser.id,
      name: "Pro Supplier Ltd",
      email: "supplier@example.com",
      description: "We supply high-quality products",
      isVerified: true,
      rating: 4.5,
    },
  });

  // --- CERTIFICATIONS ---
  for (let i = 1; i <= 4; i++) {
    await prisma.certification.create({
      data: {
        supplierId: supplier.id,
        image: `/images/certs/c${i}.jpg`,
        label: `Certificate ${i}`,
        certNumber: `CERT-${i}${faker.string.alphanumeric(5)}`,
        validUntil: faker.date.future(),
      },
    });
  }

  // --- BRANDS ---
  const brand = await prisma.brand.create({
    data: {
      name: "BrandOne",
      description: "A sample brand",
    },
  });

  // --- CATEGORIES + SUBCATEGORIES ---
  const category = await prisma.category.create({
    data: {
      name_en: "Electronics",
      name_sw: "Vifaa vya umeme",
      description: "Electronics category",
      subcategories: {
        create: [
          { name_en: "Phones", name_sw: "Simu" },
          { name_en: "Laptops", name_sw: "Kompyuta" },
        ],
      },
    },
    include: { subcategories: true },
  });

  // --- PRODUCTS ---
  let productCount = 1;
  for (let i = 0; i < 6; i++) {
    const subcat = category.subcategories[i % category.subcategories.length];

    await prisma.product.create({
      data: {
        name: `Product ${i + 1}`,
        slug: `product-${i + 1}`,
        description: faker.commerce.productDescription(),
        images: [
          `/images/sample-products/p${i + 1}-1.jpg`,
          `/images/sample-products/p${i + 1}-2.jpg`,
        ],
        thumbnail: `/images/sample-products/p${i + 1}-1.jpg`,
        price: faker.number.int({ min: 10000, max: 200000 }),
        stock: faker.number.int({ min: 10, max: 200 }),
        supplierId: supplier.id,
        brandId: brand.id,
        categoryId: category.id,
        subcategoryId: subcat.id,
      },
    });

    productCount++;
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
