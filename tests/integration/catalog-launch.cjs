function assertTarget() {
  const target = process.env.PROSTORE_TEST_DATABASE_URL;
  if (
    !/^postgresql:\/\/postgres:local-test-only@127\.0\.0\.1:\d+\/prostore_payment_test$/.test(
      target || "",
    ) ||
    process.env.DATABASE_URL !== target
  )
    throw Error("Disposable rehearsal datasource mismatch");
}
assertTarget();
const { prisma } = require("./database.cjs");
const { catalogLaunchPlan } = require("@/lib/catalog-launch");
const { visibleSeller } = require("@/lib/catalog-visibility");
// Deliberately not a production migration or server action. Only the established
// disposable harness target is accepted; never reads a source DATABASE_URL.
async function rehearseCatalogLaunch(input) {
  assertTarget();
  const plan = catalogLaunchPlan(input);
  if (
    !/^postgresql:\/\/postgres:local-test-only@127\.0\.0\.1:\d+\/prostore_payment_test$/.test(
      process.env.PROSTORE_TEST_DATABASE_URL || "",
    )
  )
    throw Error("Disposable rehearsal only");
  return prisma.$transaction(
    async (tx) => {
      const identity =
        await tx.$queryRaw`SELECT current_database()::text AS name`;
      if (identity[0]?.name !== "prostore_payment_test")
        throw Error("Wrong rehearsal database");
      await tx.$executeRawUnsafe(
        'LOCK TABLE "Product", "ProductPricing", "ProductVariant", "Brand", "Category", "Subcategory", "Supplier", "SellerRegistration", "User", "Order", "SupplierLedger", "PayoutRequest", "ReturnRequest", "PaymentAttempt", "MoneyReviewCase", "OrderNotification", "MarketThread", "Cart", "Message", "Conversation", "Inquiry", "Quote", "Notification", "OrderItemEvent", "OrderDeliveryFeedback", "Review", "ProductComment" IN ACCESS EXCLUSIVE MODE',
      );
      for (const count of [
        await tx.order.count(),
        await tx.supplierLedger.count(),
        await tx.payoutRequest.count(),
        await tx.returnRequest.count(),
        await tx.paymentAttempt.count(),
        await tx.moneyReviewCase.count(),
        await tx.orderNotification.count(),
        await tx.marketThread.count(),
        await tx.cart.count(),
        await tx.message.count(),
        await tx.conversation.count(),
        await tx.inquiry.count(),
        await tx.quote.count(),
        await tx.notification.count(),
        await tx.orderItemEvent.count(),
        await tx.orderDeliveryFeedback.count(),
        await tx.review.count(),
        await tx.productComment.count(),
        await tx.product.count(),
        await tx.brand.count(),
        await tx.category.count(),
        await tx.subcategory.count(),
      ])
        if (count) throw Error("Target is not an empty operational catalog");
      if (
        await tx.supplier.count({
          where: {
            OR: [{ pendingBalance: { not: 0 } }, { walletBalance: { not: 0 } }],
          },
        })
      )
        throw Error("Existing balances must not be changed");
      for (const mapping of plan.data.suppliers) {
        const s = await tx.supplier.findFirst({
          where: { id: mapping.targetId, ...visibleSeller },
          include: { user: true },
        });
        if (
          !s ||
          !s.isVerified ||
          s.user.role !== "SUPPLIER" ||
          !s.user.phoneVerified
        )
          throw Error("Seller ownership and verification required");
      }
      for (const row of plan.data.brands) await tx.brand.create({ data: row });
      for (const row of plan.data.categories)
        await tx.category.create({ data: row });
      for (const row of plan.data.subcategories)
        await tx.subcategory.create({ data: row });
      for (const p of plan.data.products) {
        const { openingStock, stockReviewed, ...row } = p;
        void stockReviewed;
        await tx.product.create({
          data: {
            ...row,
            createdAt: new Date(row.createdAt),
            supplierId: plan.data.suppliers.find(
              (s) => s.sourceId === p.supplierId,
            ).targetId,
            stock: openingStock,
            rating: 0,
            numReviews: 0,
          },
        });
      }
      for (const v of plan.data.variants) {
        const { openingStock, stockReviewed, ...row } = v;
        void stockReviewed;
        await tx.productVariant.create({
          data: { ...row, stock: openingStock },
        });
      }
      for (const row of plan.data.tiers)
        await tx.productPricing.create({ data: row });
      return {
        digest: plan.digest,
        products: plan.data.products.length,
        importedHistoricalTransactions: 0,
        productionExecutionEnabled: false,
      };
    },
    { timeout: 30000 },
  );
}

module.exports = { rehearseCatalogLaunch };
