import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function runRawSQL() {
  const result = await prisma.$queryRawUnsafe(
    `SELECT * FROM "Supplier" WHERE "userId" NOT IN (SELECT "id" FROM "User")`
  );
  console.log(result);
}

runRawSQL()
  .catch((e) => {
    console.error("❌ Error running SQL:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
