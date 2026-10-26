import Link from "next/link";
import { getFulfillmentOrder } from "@/lib/fulfillment-view";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import SupplierOrderActions from "@/components/supplier/orders/SupplierOrderActions";

export default function FulfillmentDetails({
  order,
  seller = false,
}: {
  order: NonNullable<Awaited<ReturnType<typeof getFulfillmentOrder>>>;
  seller?: boolean;
}) {
  const address = order.shippingAddress;
  const delivered = order.orderitems.filter((item) => item.isDelivered).length;
  return (
    <section className="max-w-5xl mx-auto space-y-4 pb-24">
      <Link
        className="underline"
        href={seller ? "/supplier/orders" : "/admin/orders"}
      >
        Rudi kwenye maagizo
      </Link>
      <h1 className="text-xl font-bold break-all">
        Agizo #{order.id.slice(0, 8)}
      </h1>
      <p>Malipo: {order.isPaid ? "Yamelipwa" : "Yanasubiri"}</p>
      <p role="status">
        Bidhaa zilizopokelewa: {delivered}/{order.orderitems.length}
        {seller ? " za duka lako" : ""}
      </p>
      <section
        className="rounded-xl border bg-white p-4 space-y-1"
        aria-label="Anwani ya agizo"
      >
        <h2 className="font-semibold">
          Anwani ya kupokea iliyohifadhiwa kwenye agizo
        </h2>
        <p>{address.fullName}</p>
        <p>
          {address.streetAddress}, {address.city}, {address.country}
        </p>
        <p>{address.postalCode}</p>
        <p>{address.phone || "Namba ya kupokea haijawekwa"}</p>
      </section>
      {order.orderitems.map((item) => (
        <article
          key={item.productId}
          className="rounded-xl border bg-white p-4 space-y-2"
        >
          <h2 className="font-semibold">{item.name}</h2>
          {!seller && (
            <p>
              Muuzaji: {item.supplierName || item.supplierId || "Haijapatikana"}
            </p>
          )}
          <p>
            Idadi: {item.qty} · Jumla ya bidhaa:{" "}
            {formatCurrency(Number(item.price) * item.qty)}
          </p>
          <p>Hali ya usafirishaji: {item.status}</p>
          <p>
            Hali ya fedha za muuzaji:{" "}
            {!order.isPaid
              ? "Haijafadhiliwa — malipo yanasubiri"
              : item.payoutStatus === "ESCROW"
                ? "Escrow — bado hazijaachiliwa"
                : item.payoutStatus === "PAID"
                  ? "Imeachiliwa kwenye wallet; si uthibitisho wa withdrawal"
                  : item.payoutStatus}
          </p>
          {item.dispatchedAt && (
            <p>Ilitumwa: {formatDateTime(item.dispatchedAt).dateTime}</p>
          )}
          <p className="text-sm text-slate-600">
            Taarifa za usafirishaji zimeandikwa na muuzaji; si ufuatiliaji wa
            moja kwa moja wa kampuni ya usafirishaji.
          </p>
          {item.dispatchNote && (
            <p className="whitespace-pre-wrap break-words bg-slate-50 p-2 rounded">
              {item.dispatchNote}
            </p>
          )}
          {item.deliveredAt && (
            <p>
              Imethibitishwa kupokelewa:{" "}
              {formatDateTime(item.deliveredAt).dateTime}
            </p>
          )}
          {item.disputeStatus && (
            <p>Ombi la tatizo/kurudisha: {item.disputeStatus}</p>
          )}
          {item.rejectionReason && (
            <p className="whitespace-pre-wrap break-words">
              Tatizo lililoripotiwa: {item.rejectionReason}
            </p>
          )}
          {item.buyerDeliveryRating != null && (
            <p>Tathmini baada ya kupokea: {item.buyerDeliveryRating}/5</p>
          )}
          {item.buyerDeliveryComment && (
            <p>Maoni baada ya kupokea: {item.buyerDeliveryComment}</p>
          )}
          {seller &&
            order.isPaid &&
            (!item.disputeStatus || item.disputeStatus === "REJECTED") && (
              <SupplierOrderActions
                orderId={order.id}
                productId={item.productId}
                status={item.status}
                isDelivered={item.isDelivered}
              />
            )}
        </article>
      ))}
    </section>
  );
}
