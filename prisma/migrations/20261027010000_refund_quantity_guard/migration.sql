-- Forward-only guard. NULL makes the earlier composite CHECK unknown, not false.
-- Do not rewrite or infer quantities for any existing invalid review case.
ALTER TABLE "MoneyReviewCase" ADD CONSTRAINT "MoneyReviewCase_refund_quantity_required"
CHECK ("kind" <> 'REFUND' OR "quantity" IS NOT NULL);
