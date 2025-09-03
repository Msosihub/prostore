import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedCertifications() {
  const suppliers = await prisma.supplier.findMany();

  for (const supplier of suppliers) {
    const existing = await prisma.certification.findMany({
      where: { supplierId: supplier.id },
    });

    if (existing.length === 0) {
      await prisma.certification.createMany({
        data: [
          {
            supplierId: supplier.id,
            image: "/certs/iso9001.jpg",
            label: "ISO 9001 Quality Management",
            certNumber: `${supplier.name}-ISO-9001-2023`,
            validUntil: new Date("2026-12-31"),
          },
          {
            supplierId: supplier.id,
            image: "/certs/ce_safety.jpg",
            label: "CE Safety Compliance",
            certNumber: `${supplier.name}-CE-2023`,
            validUntil: new Date("2025-08-31"),
          },
          {
            supplierId: supplier.id,
            image: "/certs/eco_label.jpg",
            label: "Eco Label Certification",
            certNumber: `${supplier.name}-ECO-2023`,
            validUntil: new Date("2026-03-15"),
          },
        ],
      });
      console.log(`✅ Certifications seeded for ${supplier.name}`);
    } else {
      console.log(`ℹ️ Skipped ${supplier.name}, already has certifications`);
    }
  }
}

seedCertifications()
  .catch((e) => {
    console.error("❌ Certifications seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
