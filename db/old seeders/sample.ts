import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Brands
  await prisma.brand.createMany({
    data: [
      { name: "Polo" },
      { name: "Calvin Klein" },
      { name: "Samsung" },
      { name: "Xiaomi" },
      { name: "Carlover" },
    ],
  });

  // Categories
  const carCategory = await prisma.category.create({
    data: {
      name_en: "Car Accessories",
      name_sw: "Vifaa vya Gari",
      image: "https://images.unsplash.com/photo-1605559424843-3f9b6f3b6f3e",
    },
  });

  const electronicsCategory = await prisma.category.create({
    data: {
      name_en: "Electronics",
      name_sw: "Vifaa vya Kielektroniki",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
    },
  });

  const fashionCategory = await prisma.category.create({
    data: {
      name_en: "Fashion",
      name_sw: "Mavazi",
      image: "https://images.unsplash.com/photo-1521335629791-ce4aec67dd49",
    },
  });

  // Subcategories
  const dashCams = await prisma.subcategory.create({
    data: {
      name_en: "Dash Cameras",
      name_sw: "Kamera za Gari",
      image: "https://images.unsplash.com/photo-1612810802945-6e3c3e3c3e3c",
      categoryId: carCategory.id,
    },
  });

  const smartWatches = await prisma.subcategory.create({
    data: {
      name_en: "Smart Watches",
      name_sw: "Saa za Kisasa",
      image: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b",
      categoryId: electronicsCategory.id,
    },
  });

  const hoodies = await prisma.subcategory.create({
    data: {
      name_en: "Hoodies",
      name_sw: "Hoodi",
      image: "https://images.unsplash.com/photo-1602810311515-3f9b6f3b6f3e",
      categoryId: fashionCategory.id,
    },
  });

  // Supplier
  const supplier = await prisma.supplier.create({
    data: {
      name: "Tanzania Traders",
      email: "supplier@tanzaniatraders.co.tz",
      phone: "+255712345678",
      companyName: "Tanzania Traders Ltd",
      location: "Dar es Salaam",
      logo: "https://images.unsplash.com/photo-1602810311515-3f9b6f3b6f3e",
      isVerified: true,
    },
  });

  // Sample Product
  await prisma.product.create({
    data: {
      name: "Polo Classic Hoodie",
      slug: "polo-classic-hoodie",
      description: "Comfortable and stylish hoodie for everyday wear.",
      images: ["https://images.unsplash.com/photo-1618354691214-3f9b6f3b6f3e"],
      banner: "https://images.unsplash.com/photo-1602810311515-3f9b6f3b6f3e",
      price: 45000,
      stock: 120,
      color: "Black",
      size: "L",
      supplierId: supplier.id,
      brandId: (await prisma.brand.findFirst({ where: { name: "Polo" } }))!.id,
      categoryId: fashionCategory.id,
      subcategoryId: hoodies.id,
      isFeatured: true,
    },
  });
}

main()
  .then(() => {
    console.log("✅ Seed completed");
  })
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
