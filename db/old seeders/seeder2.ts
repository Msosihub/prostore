import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Find existing supplier
  const supplier = await prisma.supplier.findFirst({
    where: { email: "senkule@gmail.com" },
  });

  if (!supplier) throw new Error("Supplier not found");

  // Find required brands
  const polo = await prisma.brand.findFirst({ where: { name: "Polo" } });
  const samsung = await prisma.brand.findFirst({ where: { name: "Samsung" } });
  const xiaomi = await prisma.brand.findFirst({ where: { name: "Xiaomi" } });
  const carlover = await prisma.brand.findFirst({
    where: { name: "Carlover" },
  });

  // Find categories and subcategories
  const fashionCategory = await prisma.category.findFirst({
    where: { name_en: "Fashion" },
  });
  const electronicsCategory = await prisma.category.findFirst({
    where: { name_en: "Electronics" },
  });
  const carCategory = await prisma.category.findFirst({
    where: { name_en: "Car Accessories" },
  });

  const hoodies = await prisma.subcategory.findFirst({
    where: { name_en: "Hoodies" },
  });
  const smartWatches = await prisma.subcategory.findFirst({
    where: { name_en: "Smart Watches" },
  });
  const dashCams = await prisma.subcategory.findFirst({
    where: { name_en: "Dash Cameras" },
  });

  // Add 5 new products
  await prisma.product.createMany({
    data: [
      {
        name: "Samsung Galaxy Watch 5",
        slug: "samsung-galaxy-watch-5",
        description: "Advanced health tracking and sleek design.",
        images: [
          "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b",
        ],
        banner: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b",
        price: 180000,
        stock: 60,
        color: "Graphite",
        size: "One Size",
        supplierId: supplier.id,
        brandId: samsung!.id,
        categoryId: electronicsCategory!.id,
        subcategoryId: smartWatches!.id,
        isFeatured: true,
      },
      {
        name: "Xiaomi Mi Dash Cam 2K",
        slug: "xiaomi-mi-dash-cam-2k",
        description: "Crystal-clear recording with night vision.",
        images: [
          "https://images.unsplash.com/photo-1612810802945-6e3c3e3c3e3c",
        ],
        banner: "https://images.unsplash.com/photo-1612810802945-6e3c3e3c3e3c",
        price: 95000,
        stock: 40,
        color: "Black",
        size: "Compact",
        supplierId: supplier.id,
        brandId: xiaomi!.id,
        categoryId: carCategory!.id,
        subcategoryId: dashCams!.id,
        isFeatured: false,
      },
      {
        name: "Carlover Rearview Dash Cam",
        slug: "carlover-rearview-dash-cam",
        description: "Dual lens rearview mirror dash cam with parking assist.",
        images: [
          "https://images.unsplash.com/photo-1605559424843-3f9b6f3b6f3e",
        ],
        banner: "https://images.unsplash.com/photo-1605559424843-3f9b6f3b6f3e",
        price: 85000,
        stock: 50,
        color: "Silver",
        size: "Universal Fit",
        supplierId: supplier.id,
        brandId: carlover!.id,
        categoryId: carCategory!.id,
        subcategoryId: dashCams!.id,
        isFeatured: false,
      },
      {
        name: "Polo Zip-Up Hoodie",
        slug: "polo-zip-up-hoodie",
        description: "Stylish zip-up hoodie for cool evenings.",
        images: [
          "https://images.unsplash.com/photo-1521335629791-ce4aec67dd49",
        ],
        banner: "https://images.unsplash.com/photo-1521335629791-ce4aec67dd49",
        price: 48000,
        stock: 90,
        color: "Grey",
        size: "M",
        supplierId: supplier.id,
        brandId: polo!.id,
        categoryId: fashionCategory!.id,
        subcategoryId: hoodies!.id,
        isFeatured: true,
      },
      {
        name: "Xiaomi Smart Hoodie",
        slug: "xiaomi-smart-hoodie",
        description: "Tech-inspired hoodie with breathable fabric.",
        images: [
          "https://images.unsplash.com/photo-1602810311515-3f9b6f3b6f3e",
        ],
        banner: "https://images.unsplash.com/photo-1602810311515-3f9b6f3b6f3e",
        price: 52000,
        stock: 70,
        color: "Navy Blue",
        size: "XL",
        supplierId: supplier.id,
        brandId: xiaomi!.id,
        categoryId: fashionCategory!.id,
        subcategoryId: hoodies!.id,
        isFeatured: true,
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(() => {
    console.log("✅ Additional products seeded");
  })
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
