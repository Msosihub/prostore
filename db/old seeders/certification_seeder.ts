import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function seedCertifications() {
  const xiaomi = await prisma.supplier.findUnique({
    where: { email: "xiaomi@supplier.com" },
  });

  const polo = await prisma.supplier.findUnique({
    where: { email: "polo@supplier.com" },
  });

  if (!xiaomi || !polo) {
    console.error("❌ Supplier not found");
    return;
  }

  await prisma.certification.createMany({
    data: [
      {
        supplierId: xiaomi.id,
        image: "/certs/iso9001.jpg",
        label: "ISO 9001 Quality Management",
        certNumber: "XIA-ISO-9001-2023",
        validUntil: new Date("2026-12-31"),
      },
      {
        supplierId: xiaomi.id,
        image: "/certs/ce_safety.jpg",
        label: "CE Safety Compliance",
        certNumber: "XIA-CE-2023",
        validUntil: new Date("2025-08-31"),
      },
      {
        supplierId: polo.id,
        image: "/certs/fairtrade.jpg",
        label: "Fair Trade Certified",
        certNumber: "POLO-FT-2022",
        validUntil: new Date("2025-06-30"),
      },
      {
        supplierId: polo.id,
        image: "/certs/eco_label.jpg",
        label: "Eco Label Certification",
        certNumber: "POLO-ECO-2023",
        validUntil: new Date("2026-03-15"),
      },
    ],
  });

  console.log("✅ Certifications seeded");
}

seedCertifications()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
