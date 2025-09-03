import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Brand
  const brand = await prisma.brand.upsert({
    where: { name: "TechWear" },
    update: {},
    create: { name: "TechWear" },
  });

  // Category
  const category = await prisma.category.upsert({
    where: { name_en: "Electronics" },
    update: {},
    create: {
      name_en: "Electronics",
      name_sw: "Elektroniki",
    },
  });

  // Subcategory
  const subcategory =
    (await prisma.subcategory.findFirst({
      where: {
        name_en: "Wearables",
        categoryId: category.id,
      },
    })) ??
    (await prisma.subcategory.create({
      data: {
        name_en: "Wearables",
        name_sw: "Vaa Teknolojia",
        categoryId: category.id,
      },
    }));

  // Suppliers
  const supplier1 = await prisma.supplier.upsert({
    where: { email: "xiaomi@supplier.com" },
    update: {},
    create: {
      name: "Xiaomi Tanzania",
      email: "xiaomi@supplier.com",
      phone: "+255700000001",
      companyName: "Xiaomi TZ Ltd",
      location: "Dar es Salaam",
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { email: "polo@supplier.com" },
    update: {},
    create: {
      name: "Polo East Africa",
      email: "polo@supplier.com",
      phone: "+255700000002",
      companyName: "Polo EA Ltd",
      location: "Arusha",
    },
  });

  // Products
  const productData = [
    {
      name: "Xiaomi Mi Dash Cam 2K",
      slug: "xiaomi-mi-dash-cam-2k",
      description: "Crystal-clear recording with night vision.",
      images: ["dashcam.jpg"],
      price: 120.0,
      stock: 50,
      supplierId: supplier1.id,
    },
    {
      name: "Samsung Galaxy Watch 5",
      slug: "samsung-galaxy-watch-5",
      description: "Advanced health tracking and sleek design.",
      images: ["galaxywatch.jpg"],
      price: 250.0,
      stock: 30,
      supplierId: supplier1.id,
    },
    {
      name: "Polo Zip-Up Hoodie",
      slug: "polo-zip-up-hoodie",
      description: "Stylish zip-up hoodie for cool evenings.",
      images: ["hoodie.jpg"],
      price: 45.0,
      stock: 100,
      supplierId: supplier2.id,
    },
  ];

  for (const data of productData) {
    const existing = await prisma.product.findUnique({
      where: { slug: data.slug },
    });
    const product =
      existing ??
      (await prisma.product.create({
        data: {
          ...data,
          brandId: brand.id,
          categoryId: category.id,
          subcategoryId: subcategory.id,
        },
      }));

    const existingTiers = await prisma.productPricing.findMany({
      where: { productId: product.id },
    });

    if (existingTiers.length === 0) {
      await prisma.productPricing.createMany({
        data: [
          { productId: product.id, minQty: 1, price: data.price },
          { productId: product.id, minQty: 5, price: data.price * 0.95 },
          { productId: product.id, minQty: 20, price: data.price * 0.85 },
        ],
      });
    }
  }

  console.log("✅ Seeder complete");
}

main()
  .catch((e) => {
    console.error("❌ Seeder failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
