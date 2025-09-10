import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { hashSync } from "bcrypt-ts-edge";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // --- 1. Users ---
  const buyer = await prisma.user.create({
    data: {
      name: "Buyer One",
      phone: "+255700000011",
      email: "buyer1@b.com",
      password: hashSync("12345", 10),
      role: "BUYER",
    },
  });

  const supplierUsers = await Promise.all(
    Array.from({ length: 2 }).map((_, i) =>
      prisma.user.create({
        data: {
          name: `Supplier User ${i + 1}`,
          phone: "+25570000001",
          email: `supplier${i + 1}@b.com`,
          role: "SUPPLIER",
          password: hashSync("12345", 10),
        },
      })
    )
  );

  // --- 2. Suppliers ---
  const suppliers = await Promise.all(
    supplierUsers.map((u, i) =>
      prisma.supplier.create({
        data: {
          userId: u.id,
          name: `Supplier ${i + 1}`,
          email: u.email!,
          companyName: `Company ${i + 1}`,
          nation: "Tanzania",
          website: `https://supplier${i + 1}.com`,
          logo: "/images/sample-products/p1-1-1.jpg",
        },
      })
    )
  );

  // --- 3. Brands, Categories, Subcategories ---
  const brand = await prisma.brand.create({
    data: { name: "caser", description: "Default brand" },
  });

  const category = await prisma.category.create({
    data: {
      name_en: "tupil",
      name_sw: "Vifaa vya Umeme",
      description: "xenon gadgets",
    },
  });

  const subcategory = await prisma.subcategory.create({
    data: {
      name_en: "uyo",
      name_sw: "Simu",
      categoryId: category.id,
      description: "Mobile phones",
    },
  });

  // --- 4. Products ---
  const products = await Promise.all(
    Array.from({ length: 6 }).map((_, idx) => {
      const images = [
        `/images/sample-products/p${idx + 1}-1.jpg`,
        `/images/sample-products/p${idx + 1}-2.jpg`,
      ];
      return prisma.product.create({
        data: {
          name: `Product ${idx + 1}`,
          slug: `product-${idx + 1}`,
          description: faker.commerce.productDescription(),
          images,
          thumbnail: images[0],
          price: faker.number.int({ min: 10, max: 200 }),
          stock: faker.number.int({ min: 10, max: 100 }),
          supplierId: suppliers[idx % suppliers.length].id,
          brandId: brand.id,
          categoryId: category.id,
          subcategoryId: subcategory.id,
        },
      });
    })
  );

  // --- 5. Supplier Certifications ---
  const certFiles = [
    { file: "ce_safety.jpg", label: "CE Safety" },
    { file: "eco_label.jpg", label: "Eco Label" },
    { file: "iso9001.jpg", label: "ISO 9001" },
    { file: "fairtrade.jpg", label: "Fairtrade" },
  ];

  await Promise.all(
    suppliers.map((s) =>
      Promise.all(
        certFiles.map((c, i) =>
          prisma.certification.create({
            data: {
              supplierId: s.id,
              image: `/images/certs/${c.file}`,
              label: c.label,
              certNumber: `CERT-${i + 1}-${s.id.slice(0, 4)}`,
              validUntil: faker.date.future(),
            },
          })
        )
      )
    )
  );

  console.log("✅ Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
