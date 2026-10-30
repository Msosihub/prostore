// Called only by the isolated migration runner; receives its own disconnected container.
const assert = require("node:assert/strict");
module.exports = function ({ sql, docker, name, migrations, replay }) {
  const migration = migrations.find(
    (m) => m.name === "20261027020000_runtime_marketplace_baseline",
  );
  assert(migration);
  const before = migrations.slice(0, migrations.indexOf(migration));
  const baseline = replay("repair_baseline", false, before);
  assert(baseline.every((x) => x.passed));
  const query = (db, s) => {
    const r = sql(db, s);
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  const user = `INSERT INTO "User" (id,name,"updatedAt") VALUES ('10000000-0000-4000-8000-000000000001','Synthetic',CURRENT_TIMESTAMP);`;
  const supplier = `INSERT INTO "Supplier" (id,"userId",name,email,"updatedAt") VALUES ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Synthetic','fixture@example.invalid',CURRENT_TIMESTAMP);`;
  const order = `INSERT INTO "Order" (id,"userId","shippingAddress","paymentMethod","itemsPrice","shippingPrice","taxPrice","totalPrice") VALUES ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','{}','Mobile',1000,0,0,1000);`;
  const product = `INSERT INTO "Brand" (name) VALUES ('Synthetic'); INSERT INTO "Category" (name_en,name_sw) VALUES ('Synthetic','Synthetic'); INSERT INTO "Subcategory" (name_en,name_sw,"categoryId") SELECT 'Synthetic','Synthetic',id FROM "Category"; INSERT INTO "Product" (name,slug,description,images,tags,"supplierId","brandId","categoryId","subcategoryId") SELECT 'Synthetic','synthetic','fixture',ARRAY[]::text[],ARRAY[]::text[],'20000000-0000-4000-8000-000000000001',b.id,c.id,s.id FROM "Brand" b,"Category" c,"Subcategory" s;`;
  const conversation = `INSERT INTO "Conversation" (id,"buyerId","supplierId","updatedAt") VALUES ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','2026-01-01 00:00:00.123');`;
  const dataFingerprint = (db) =>
    [
      "Account",
      "Inquiry",
      "Quote",
      "User",
      "Supplier",
      "Order",
      "OrderItem",
      "PayoutRequest",
      "Message",
      "Conversation",
    ]
      .map((t) =>
        query(
          db,
          `SELECT md5(COALESCE(string_agg(row_to_json(x)::text,',' ORDER BY row_to_json(x)::text),'')) FROM "${t}" x;`,
        ),
      )
      .join(":");
  const fingerprint = (db) =>
    query(
      db,
      `SELECT md5(string_agg(row_to_json(c)::text,',' ORDER BY table_name,column_name)) FROM (SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public') c;`,
    );
  const results = [];
  for (const [label, seed, allowed] of [
    ["empty", "", true],
    ["nonfinancial_accounts", user + supplier, true],
    [
      "wallet_history",
      user + supplier + `UPDATE "Supplier" SET "walletBalance"=1;`,
      false,
    ],
    [
      "pending_escrow",
      user + supplier + `UPDATE "Supplier" SET "pendingBalance"=1;`,
      false,
    ],
    [
      "paid_order",
      user +
        `INSERT INTO "Order" ("userId","shippingAddress","paymentMethod","itemsPrice","shippingPrice","taxPrice","totalPrice","isPaid") VALUES ('10000000-0000-4000-8000-000000000001','{}','Mobile',1000,0,0,1000,true);`,
      false,
    ],
    [
      "unpaid_order_items",
      user +
        supplier +
        order +
        product +
        `INSERT INTO "OrderItem" ("orderId","productId",qty,price,name,slug,image) SELECT '40000000-0000-4000-8000-000000000001',id,1,1000,name,slug,'' FROM "Product";`,
      false,
    ],
    [
      "pending_attempt",
      user +
        order +
        `INSERT INTO "PaymentAttempt" (id,"orderId","providerOrderId",amount) VALUES ('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','synthetic',1000);`,
      false,
    ],
    [
      "legacy_messages",
      user +
        `INSERT INTO "Conversation" (id,"buyerId","supplierId","updatedAt") VALUES ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',CURRENT_TIMESTAMP); INSERT INTO "Message" ("conversationId","senderId") VALUES ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');`,
      false,
    ],
    [
      "payout_history",
      user +
        supplier +
        `INSERT INTO "PayoutRequest" ("supplierId","userId",amount,"paymentMethod","accountNumber","updatedAt") VALUES ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,'MANUAL','synthetic',CURRENT_TIMESTAMP);`,
      false,
    ],
    [
      "timestamp_loss",
      user +
        `INSERT INTO "Account" ("userId",type,provider,"providerAccountId","createdAt","updatedAt") VALUES ('10000000-0000-4000-8000-000000000001','fixture','fixture','fixture','2026-01-01 00:00:00.123456',CURRENT_TIMESTAMP);`,
      false,
    ],
    [
      "invalid_inquiry_reference",
      user +
        conversation +
        `INSERT INTO "Inquiry" ("conversationId","productId","updatedAt") VALUES ('30000000-0000-4000-8000-000000000001','not-a-uuid','2026-01-01');`,
      false,
    ],
    [
      "orphan_inquiry_reference",
      user +
        conversation +
        `INSERT INTO "Inquiry" ("conversationId","productId","updatedAt") VALUES ('30000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','2026-01-01');`,
      false,
    ],
    [
      "valid_inquiry_reference",
      user +
        supplier +
        product +
        conversation +
        `INSERT INTO "Inquiry" ("conversationId","productId","updatedAt") SELECT '30000000-0000-4000-8000-000000000001',id::text,'2026-01-01' FROM "Product";`,
      true,
    ],
    [
      "partial_ddl",
      'ALTER TABLE "User" ADD COLUMN "chatwootAgentId" INTEGER;',
      false,
    ],
    ["existing_ledger", 'CREATE TABLE "SupplierLedger" (id UUID);', false],
  ]) {
    const db = "repair_" + label;
    docker([
      "exec",
      name,
      "createdb",
      "-U",
      "postgres",
      "-T",
      "repair_baseline",
      db,
    ]);
    query(db, seed || "SELECT 1;");
    const beforeShape = fingerprint(db);
    const beforeData = dataFingerprint(db);
    const r = sql(db, migration.sql);
    if (allowed) assert.equal(r.status, 0, r.stderr);
    else {
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /RECONCILIATION_REQUIRED/);
      assert.equal(fingerprint(db), beforeShape);
      assert.equal(dataFingerprint(db), beforeData);
    }
    if (label === "wallet_history")
      assert.equal(
        query(db, 'SELECT "walletBalance" FROM "Supplier";'),
        "1.00",
      );
    if (label === "pending_escrow")
      assert.equal(
        query(db, 'SELECT "pendingBalance" FROM "Supplier";'),
        "1.00",
      );
    results.push({ case: label, passed: true, allowed });
  }
  docker(["exec",name,"createdb","-U","postgres","-T","repair_baseline","repair_interrupted"]);
  const interruptedBefore=fingerprint("repair_interrupted");
  const interrupted=sql("repair_interrupted",migration.sql.replace("COMMIT;","SELECT 1/0; COMMIT;"));
  assert.notEqual(interrupted.status,0);assert.equal(fingerprint("repair_interrupted"),interruptedBefore);
  results.push({case:"failure_after_ddl_rolls_back_all_objects",passed:true,allowed:false});
  // A concurrent financial writer commits while migration waits for the source lock.
  docker([
    "exec",
    name,
    "createdb",
    "-U",
    "postgres",
    "-T",
    "repair_baseline",
    "repair_race",
  ]);
  query("repair_race", user + supplier);
  docker([
    "exec",
    "-d",
    name,
    "psql",
    "-X",
    "-U",
    "postgres",
    "-d",
    "repair_race",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `BEGIN; LOCK TABLE "Supplier" IN ACCESS EXCLUSIVE MODE; UPDATE "Supplier" SET "walletBalance"=3; SELECT pg_sleep(2); COMMIT;`,
  ]);
  let locked = false;
  for (let i = 0; i < 30; i++) {
    if (
      query(
        "repair_race",
        `SELECT count(*) FROM pg_locks WHERE relation='"Supplier"'::regclass AND mode='AccessExclusiveLock' AND granted;`,
      ) !== "0"
    ) {
      locked = true;
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  }
  assert(locked);
  const race = sql("repair_race", migration.sql);
  assert.notEqual(race.status, 0);
  assert.match(race.stderr, /financial history/);
  assert.equal(
    query("repair_race", 'SELECT "walletBalance" FROM "Supplier";'),
    "3.00",
  );
  assert.equal(
    query(
      "repair_race",
      `SELECT to_regclass('public."SupplierLedger"') IS NULL;`,
    ),
    "t",
  );
  results.push({
    case: "concurrent_financial_writer",
    passed: true,
    allowed: false,
  });
  // Exact repaired contracts: fields/types/nullability/defaults, PKs and unique indexes.
  const columns = JSON.parse(
    query(
      "chain_strict",
      `SELECT json_agg(row_to_json(c)) FROM (SELECT c.relname AS table_name,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS required,pg_get_expr(d.adbin,d.adrelid) AS default_value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped AND c.relkind='r') c;`,
    ),
  );
  const expected = {
    SupplierLedger: {
      id: ["uuid", true],
      supplierId: ["uuid", true],
      orderId: ["uuid", true],
      orderItemId: ["uuid", false],
      type: ["text", true],
      amount: ["numeric(12,2)", true],
      status: ["text", true],
      reference: ["text", false],
      metadata: ["jsonb", false],
      createdAt: ["timestamp(6) without time zone", true],
    },
    OrderItemEvent: {
      id: ["uuid", true],
      orderId: ["uuid", true],
      productId: ["uuid", true],
      actorId: ["uuid", false],
      type: ["text", true],
      note: ["text", false],
      metadata: ["jsonb", false],
      createdAt: ["timestamp(6) without time zone", true],
    },
    OrderDeliveryFeedback: {
      id: ["uuid", true],
      orderId: ["uuid", true],
      productId: ["uuid", true],
      buyerId: ["uuid", true],
      supplierId: ["uuid", true],
      rating: ["integer", true],
      comment: ["text", false],
      createdAt: ["timestamp(6) without time zone", true],
    },
    ReturnRequest: {
      id: ["uuid", true],
      orderId: ["uuid", true],
      productId: ["uuid", true],
      buyerId: ["uuid", true],
      supplierId: ["uuid", true],
      reason: ["text", true],
      status: ['"ReturnRequestStatus"', true],
      adminNote: ["text", false],
      createdAt: ["timestamp(6) without time zone", true],
      updatedAt: ["timestamp(3) without time zone", true],
    },
  };
  for (const [table, fields] of Object.entries(expected)) {
    const actual = columns.filter((c) => c.table_name === table);
    assert.equal(actual.length, Object.keys(fields).length);
    for (const [field, [type, required]] of Object.entries(fields)) {
      const c = actual.find((c) => c.column_name === field);
      assert(c, table + "." + field);
      assert.equal(c.type, type);
      assert.equal(c.required, required);
      if (field === "id") assert.equal(c.default_value, "gen_random_uuid()");
      else if (field === "createdAt")
        assert.equal(c.default_value, "CURRENT_TIMESTAMP");
      else if (field === "status" && table === "ReturnRequest")
        assert.equal(c.default_value, `'REQUESTED'::"ReturnRequestStatus"`);
      else assert.equal(c.default_value, null);
    }
    assert.equal(
      query(
        "chain_strict",
        `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='"${table}"'::regclass AND contype='p';`,
      ),
      "PRIMARY KEY (id)",
    );
    assert.equal(
      query(
        "chain_strict",
        `SELECT count(*) FROM pg_constraint WHERE conrelid='"${table}"'::regclass AND contype='f';`,
      ),
      "0",
    );
  }
  const added = {
    User: {
      chatwootAgentId: ["integer", false],
      chatwootContactId: ["integer", false],
    },
    OrderItem: {
      status: ['"OrderItemStatus"', true],
      dispatchNote: ["text", false],
      dispatchedAt: ["timestamp(6) without time zone", false],
      buyerDeliveryComment: ["text", false],
      buyerDeliveryRating: ["integer", false],
      rejectedAt: ["timestamp(6) without time zone", false],
      rejectionReason: ["text", false],
    },
    Message: {
      updatedAt: ["timestamp(3) without time zone", true],
      chatwootId: ["integer", false],
      chatwootStatus: ["text", false],
      chatwootMessageId: ["integer", false],
    },
    Conversation: {
      chatwootContactId: ["integer", false],
      chatwootConversationId: ["integer", false],
      chatwootInboxId: ["integer", false],
      chatwootLastMessageAt: ["timestamp(3) without time zone", false],
    },
  };
  for (const [table, fields] of Object.entries(added))
    for (const [field, [type, required]] of Object.entries(fields)) {
      const c = columns.find(
        (c) => c.table_name === table && c.column_name === field,
      );
      assert(c);
      assert.equal(c.type, type);
      assert.equal(c.required, required);
      const defaults = {
        "OrderItem.status": `'PREPARING'::"OrderItemStatus"`,
        "Message.updatedAt": "CURRENT_TIMESTAMP",
        "Message.chatwootStatus": "'pending'::text",
      };
      assert.equal(c.default_value, defaults[table + "." + field] ?? null);
    }
  for (const [table, index, fields] of [
    ["SupplierLedger", "SupplierLedger_reference_key", "reference"],
    [
      "OrderDeliveryFeedback",
      "OrderDeliveryFeedback_orderId_productId_key",
      '"orderId", "productId"',
    ],
    [
      "ReturnRequest",
      "ReturnRequest_orderId_productId_key",
      '"orderId", "productId"',
    ],
    ["Message", "Message_chatwootId_key", '"chatwootId"'],
    [
      "Conversation",
      "Conversation_chatwootConversationId_key",
      '"chatwootConversationId"',
    ],
  ]) {
    const def = query(
      "chain_strict",
      `SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='${table}' AND indexname='${index}';`,
    );
    assert(def.startsWith("CREATE UNIQUE INDEX"));
    assert(def.endsWith("(" + fields + ")"));
  }
  for (const [type, labels] of [
    [
      "OrderItemStatus",
      "PAID,PREPARING,DISPATCHED,DELIVERED,REJECTED,RETURNED,CANCELLED",
    ],
    ["ReturnRequestStatus", "REQUESTED,APPROVED,REJECTED,REFUNDED"],
  ])
    assert.equal(
      query(
        "chain_strict",
        `SELECT string_agg(e.enumlabel,',' ORDER BY e.enumsortorder) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='${type}';`,
      ),
      labels,
    );
  const preflight = require("node:fs").readFileSync(
    require("node:path").join(__dirname, "runtime-baseline-preflight.sql"),
    "utf8",
  );
  assert.match(
    query("chain_strict", preflight),
    /SupplierLedger_reference_key\|t/,
  );
  docker([
    "exec",
    name,
    "createdb",
    "-U",
    "postgres",
    "-T",
    "chain_strict",
    "repair_bad_index",
  ]);
  query(
    "repair_bad_index",
    'DROP INDEX "SupplierLedger_reference_key"; CREATE UNIQUE INDEX "SupplierLedger_reference_key" ON "SupplierLedger"(id);',
  );
  assert.match(
    query("repair_bad_index", preflight),
    /SupplierLedger_reference_key\|f/,
  );
  query(
    "repair_bad_index",
    'DROP INDEX "SupplierLedger_reference_key"; CREATE UNIQUE INDEX "SupplierLedger_reference_key" ON "SupplierLedger"(reference) WHERE reference IS NOT NULL;',
  );
  assert.match(
    query("repair_bad_index", preflight),
    /SupplierLedger_reference_key\|f/,
  );
  results.push({
    case: "wrong_column_and_partial_index_preflight",
    passed: true,
  });
  assert.equal(
    query(
      "chain_strict",
      `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='"Inquiry"'::regclass AND conname='Inquiry_productId_fkey';`,
    ),
    'FOREIGN KEY ("productId") REFERENCES "Product"(id) ON UPDATE CASCADE ON DELETE SET NULL',
  );
  // Backup/restore the actual migrated schema, not the generated fixture schema.
  query(
    "chain_strict",
    `INSERT INTO "SupplierLedger" ("supplierId","orderId",type,amount,status,reference) VALUES ('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','ADJUSTMENT',7,'COMPLETED','synthetic-restore-proof');`,
  );
  const dump = docker([
    "exec",
    name,
    "pg_dump",
    "-U",
    "postgres",
    "--no-owner",
    "--no-privileges",
    "chain_strict",
  ]);
  docker(["exec", name, "createdb", "-U", "postgres", "repair_restored"]);
  query("repair_restored", dump);
  assert.equal(fingerprint("repair_restored"), fingerprint("chain_strict"));
  assert.equal(
    query(
      "repair_restored",
      `SELECT amount FROM "SupplierLedger" WHERE reference='synthetic-restore-proof';`,
    ),
    "7.00",
  );
  return {
    cases: results,
    backupRestore: {
      passed: true,
      scope: "strict_chain_schema_with_synthetic_ledger_row",
      dumpBytes: Buffer.byteLength(dump),
    },
    contracts:
      "four repaired tables exact columns/types/defaults/PKs/FKs; five unique indexes; two enum label sequences",
  };
};
