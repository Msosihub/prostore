const fs = require("node:fs");
const path = require("node:path");
const { PrismaPg } = require("@prisma/adapter-pg");
const url = process.env.PROSTORE_TEST_DATABASE_URL;
if (
  !url ||
  !/^postgresql:\/\/postgres:local-test-only@127\.0\.0\.1:\d+\/prostore_payment_test$/.test(
    url,
  )
) {
  throw new Error(
    "Use npm run test:payments:postgres; existing databases are never accepted",
  );
}
const generated = require(process.env.PROSTORE_TEST_CLIENT);
const prisma = new generated.PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
  errorFormat: "minimal",
});
const models = [
  "Conversation",
  "Message",
  "Inquiry",
  "Attachment",
  "VerificationToken",
  "Admin",
  "AuditLog",
  "SupplierDocument",
  "User",
  "Supplier",
  "Brand",
  "Category",
  "Subcategory",
  "Product",
  "ProductPricing",
  "Order",
  "OrderItem",
  "SupplierLedger",
  "PayoutRequest",
  "ReturnRequest",
  "OrderItemEvent",
  "OrderDeliveryFeedback",
];
const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
const literal = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const schema = fs.readFileSync(
  path.join(__dirname, "../../prisma/schema.prisma"),
  "utf8",
);
const modelDefinitions = generated.Prisma.dmmf.datamodel.models.filter((m) =>
  models.includes(m.name),
);
// Build a disposable fixture schema from the current scalar definitions, not
// historical migrations. Preserve native JSON/UUID/decimal types and constraints.
async function prepare() {
  for (let attempt = 0; ; attempt++) {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
      break;
    } catch (error) {
      if (attempt === 20) throw error;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  if (process.env.PROSTORE_TEST_HISTORICAL_CHAIN === "1") {
    // Still accepts only this harness's synthetic loopback database URL above.
    const client = new (require("pg").Client)({ connectionString: url });
    await client.connect();
    try {
      const dir = path.join(__dirname, "../../prisma/migrations");
      for (const name of fs.readdirSync(dir).sort()) {
        const file = path.join(dir, name, "migration.sql");
        if (fs.existsSync(file))
          await client.query(fs.readFileSync(file, "utf8"));
      }
    } finally {
      await client.end();
    }
    return;
  }
  for (const match of schema.matchAll(/enum (\w+) \{([\s\S]*?)\n\}/g)) {
    const values = match[2]
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    await prisma.$executeRawUnsafe(
      `CREATE TYPE ${quote(match[1])} AS ENUM (${values.map(literal).join(",")})`,
    );
  }
  for (const model of modelDefinitions) {
    const source = schema.match(
      new RegExp(`model ${model.name} \\{([\\s\\S]*?)\\n\\}`),
    )[1];
    const columns = model.fields
      .filter((f) => f.kind !== "object")
      .map((field) => {
        const line = source
          .split("\n")
          .find((l) => new RegExp(`^\\s*${field.name}\\s`).test(l));
        const native = line.match(/@db\.(\w+)(\([^)]*\))?/);
        let type =
          field.kind === "enum"
            ? quote(field.type)
            : {
                String: "text",
                Int: "integer",
                Boolean: "boolean",
                DateTime: "timestamp(6)",
                Decimal: "numeric",
                Json: "jsonb",
                Float: "double precision",
                BigInt: "bigint",
              }[field.type];
        if (native)
          type =
            {
              Uuid: "uuid",
              Json: "json",
              Decimal: `numeric${native[2]}`,
              Timestamp: `timestamp${native[2]}`,
              VarChar: "text",
            }[native[1]] || type;
        if (!type)
          throw new Error(
            `Unsupported fixture field ${model.name}.${field.name}`,
          );
        if (/^\s*\w+\s+\w+\[\]/.test(line)) type += "[]";
        let fallback = "";
        if (
          line.includes('@default(dbgenerated("gen_random_uuid()"))') ||
          line.includes("@default(uuid())")
        )
          fallback = " DEFAULT gen_random_uuid()";
        else if (line.includes("@default(now())"))
          fallback = " DEFAULT CURRENT_TIMESTAMP";
        else {
          const defaultValue = line.match(
            /@default\(("(?:[^"\\]|\\.)*"|[^)]+)\)/,
          )?.[1];
          if (defaultValue !== undefined) {
            fallback =
              " DEFAULT " +
              (defaultValue.startsWith('"')
                ? literal(JSON.parse(defaultValue))
                : field.kind === "enum"
                  ? literal(defaultValue)
                  : defaultValue);
          }
        }
        const optional = new RegExp(`^\\s*${field.name}\\s+[^\\s]+\\?`).test(
          line,
        );
        const primary = /@id(?:\s|$)/.test(line);
        const unique = /@unique(?:\s|$|\()/.test(line);
        return `${quote(field.name)} ${type}${optional ? "" : " NOT NULL"}${fallback}${primary ? " PRIMARY KEY" : unique ? " UNIQUE" : ""}`;
      });
    const composite = source.match(/@@id\(\[([^\]]+)\]/);
    if (composite)
      columns.push(
        `PRIMARY KEY (${composite[1]
          .split(",")
          .map((f) => quote(f.trim()))
          .join(",")})`,
      );
    for (const unique of source.matchAll(/@@unique\(\[([^\]]+)\]/g)) {
      columns.push(
        `UNIQUE (${unique[1]
          .split(",")
          .map((field) => quote(field.trim()))
          .join(",")})`,
      );
    }
    await prisma.$executeRawUnsafe(
      `CREATE TABLE ${quote(model.name)} (${columns.join(",")})`,
    );
  }
  for (const model of modelDefinitions) {
    const source = schema.match(
      new RegExp(`model ${model.name} \\{([\\s\\S]*?)\\n\\}`),
    )[1];
    for (const line of source.split("\n")) {
      const relation = line.match(
        /^\s*\w+\s+(\w+)\??\s+@relation\([^\n]*fields: \[([^\]]+)\], references: \[([^\]]+)\]/,
      );
      if (relation && models.includes(relation[1])) {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE ${quote(model.name)} ADD FOREIGN KEY (${relation[2]
            .split(",")
            .map((f) => quote(f.trim()))
            .join(",")}) REFERENCES ${quote(relation[1])} (${relation[3]
            .split(",")
            .map((f) => quote(f.trim()))
            .join(",")})`,
        );
      }
    }
  }
  const sellerMigration = fs.readFileSync(
    path.join(
      __dirname,
      "../../prisma/migrations/20261027030000_seller_registration/migration.sql",
    ),
    "utf8",
  );
  for (const statement of sellerMigration.split(";"))
    if (statement.trim()) await prisma.$executeRawUnsafe(statement);
  const migration = fs.readFileSync(
    path.join(
      __dirname,
      "../../prisma/migrations/20261026150000_marketplace_chat/migration.sql",
    ),
    "utf8",
  );
  for (const statement of migration.split(";"))
    if (statement.trim()) await prisma.$executeRawUnsafe(statement);
  // Fixture User already reflects the latest schema; exercise ALTER against its prior shape.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "User" DROP COLUMN "orderSmsEnabled"',
  );
  const outboxMigration = fs.readFileSync(
    path.join(
      __dirname,
      "../../prisma/migrations/20261026203000_order_notification_outbox/migration.sql",
    ),
    "utf8",
  );
  for (const statement of outboxMigration.split(";"))
    if (statement.trim()) await prisma.$executeRawUnsafe(statement);
  const recoveryMigration = fs.readFileSync(
    path.join(
      __dirname,
      "../../prisma/migrations/20261026193000_payment_recovery/migration.sql",
    ),
    "utf8",
  );
  for (const statement of recoveryMigration.split(";"))
    if (statement.trim()) await prisma.$executeRawUnsafe(statement);
  const moneyMigration = fs.readFileSync(
    path.join(
      __dirname,
      "../../prisma/migrations/20261027000000_manual_money_review/migration.sql",
    ),
    "utf8",
  );
  for (const statement of moneyMigration.split(";"))
    if (statement.trim()) await prisma.$executeRawUnsafe(statement);
  const quantityMigration = fs.readFileSync(
    path.join(
      __dirname,
      "../../prisma/migrations/20261027010000_refund_quantity_guard/migration.sql",
    ),
    "utf8",
  );
  for (const statement of quantityMigration.split(";"))
    if (statement.trim()) await prisma.$executeRawUnsafe(statement);
  const otpMigration = fs.readFileSync(
    path.join(
      __dirname,
      "../../prisma/migrations/20261026180000_otp_throttle/migration.sql",
    ),
    "utf8",
  );
  for (const statement of otpMigration.split(";"))
    if (statement.trim()) await prisma.$executeRawUnsafe(statement);
}
async function reset() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "MoneyReviewEvent", "MoneyReviewCase", "OrderNotificationEvent", "OrderNotification", "PaymentAttemptEvent", "PaymentAttempt", "OtpThrottle", ${models.map(quote).join(",")} CASCADE`,
  );
}
async function fixture({ stock = 5, qty = 2, paymentResult } = {}) {
  const user = await prisma.user.create({
    data: {
      name: "Test Buyer",
      phone: "+255700000000",
      email: "buyer@example.test",
    },
  });
  const supplier = await prisma.supplier.create({
    data: {
      userId: user.id,
      name: "Test Supplier",
      email: "supplier@example.test",
      phone: "+255700000001",
    },
  });
  const brand = await prisma.brand.create({ data: { name: "Test Brand" } });
  const category = await prisma.category.create({
    data: { name_en: "Test", name_sw: "Test" },
  });
  const subcategory = await prisma.subcategory.create({
    data: { name_en: "Test", name_sw: "Test", categoryId: category.id },
  });
  const product = await prisma.product.create({
    data: {
      name: "Test Item",
      slug: "test-item",
      description: "Test",
      images: [],
      tags: [],
      price: 1000,
      stock,
      supplierId: supplier.id,
      brandId: brand.id,
      categoryId: category.id,
      subcategoryId: subcategory.id,
    },
  });
  const order = await newOrder({ user, product, qty, paymentResult });
  return { user, supplier, product, order };
}
async function newOrder({ user, product, qty = 2, paymentResult }) {
  const { randomUUID } = require("node:crypto");
  const id = randomUUID();
  return prisma.order.create({
    data: {
      id,
      userId: user.id,
      shippingAddress: {},
      paymentMethod: "ZENOPAY",
      itemsPrice: 1000 * qty,
      shippingPrice: 0,
      taxPrice: 0,
      totalPrice: 1000 * qty,
      paymentResult:
        paymentResult === undefined
          ? { zenopay_order_id: `${id}=test` }
          : paymentResult,
      orderitems: {
        create: {
          productId: product.id,
          supplierId: product.supplierId,
          qty,
          price: 1000,
          name: "Test Item",
          slug: "test-item",
          image: "test",
        },
      },
    },
  });
}
module.exports = {
  prisma,
  Prisma: generated.Prisma,
  prepare,
  reset,
  fixture,
  newOrder,
};
