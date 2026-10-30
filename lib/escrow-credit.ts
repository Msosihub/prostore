import { Prisma } from "@prisma/client";

// A matching reference alone does not prove the credit belongs to this allocation.
export function validEscrowCredit(
  credit: {
    orderId: string;
    supplierId: string;
    type: string;
    status: string;
    amount: Prisma.Decimal | string | number;
  } | null,
  item: {
    orderId: string;
    supplierId: string | null;
    price: Prisma.Decimal | string | number;
    qty: number;
  },
) {
  if (
    !credit ||
    !item.supplierId ||
    !Number.isSafeInteger(item.qty) ||
    item.qty < 1
  )
    return false;
  const amount = new Prisma.Decimal(item.price).mul(item.qty);
  return (
    amount.isFinite() &&
    amount.greaterThan(0) &&
    credit.orderId === item.orderId &&
    credit.supplierId === item.supplierId &&
    credit.type === "ESCROW_CREDIT" &&
    credit.status === "COMPLETED" &&
    amount.equals(credit.amount)
  );
}
