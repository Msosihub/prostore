jest.mock("@/lib/utils", () => ({formatCurrency: String, formatDateTime: () => ({dateTime:"date"})}));
jest.mock(
  "@/components/supplier/orders/SupplierOrderActions",
  () => () => null,
);
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FulfillmentDetails from "@/components/orders/fulfillment-details";
test.each([false, true])("escrow label reflects funded state %s", (isPaid) => {
  const html = renderToStaticMarkup(
    <FulfillmentDetails
      order={{
        id: "order-id",
        isPaid,
        shippingAddress: {},
        orderitems: [
          {
            productId: "item",
            name: "Item",
            qty: 1,
            price: "1000",
            payoutStatus: "ESCROW",
          },
        ],
      }}
    />,
  );
  expect(html).toContain(
    isPaid
      ? "Escrow — bado hazijaachiliwa"
      : "Haijafadhiliwa — malipo yanasubiri",
  );
  if (!isPaid) expect(html).not.toContain("Escrow — bado hazijaachiliwa");
});
