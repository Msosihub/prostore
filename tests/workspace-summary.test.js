jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/lib/actions/order.actions", () => ({
  getOrderSummary: jest.fn(),
  getMyOrders: jest.fn(),
}));
jest.mock("@/lib/auth-guard", () => ({
  requireSupplier: jest.fn(async () => ({ user: { id: "seller" } })),
}));
jest.mock("@/app/supplier/overview/charts", () => ({
  __esModule: true,
  default: ({ data }) => <pre>{JSON.stringify(data)}</pre>,
}));
jest.mock("@/app/supplier/overview/daily-sales-chart", () => ({
  __esModule: true,
  default: ({ data }) => <pre>{JSON.stringify(data)}</pre>,
}));
jest.mock("@/components/shared/pagination", () => () => null);
import { renderToStaticMarkup } from "react-dom/server";
import { getOrderSummary, getMyOrders } from "@/lib/actions/order.actions";
import SupplierOverview from "@/app/supplier/overview/page";
import BuyerOrders from "@/app/user/orders/page";
test.each([
  { salesData: [] },
  { salesData: [{ month: "10/26", totalSales: 1234 }] },
])(
  "seller page forwards actual scoped chart data %p",
  async ({ salesData }) => {
    getOrderSummary.mockResolvedValue({
      available: true,
      totalSales: 1234,
      latestSales: [],
      salesData,
      salesByDayData: [],
      ordersCount: 1,
      usersCount: 1,
    });
    const html = renderToStaticMarkup(await SupplierOverview());
    expect(html).toContain("Thamani ya Bidhaa Zilizolipiwa");
    expect(html).toContain("haijumuishi usafirishaji/kodi");
    expect(html).toContain(salesData.length ? "1234" : "[]");
    expect(html).not.toContain("3121359");
    expect(getOrderSummary).toHaveBeenCalledWith("seller");
  },
);
test("buyer summary uses canonical paid state and partial item receipts", async () => {
  getMyOrders.mockResolvedValue({
    totalPages: 1,
    data: [
      {
        id: "test-order",
        createdAt: new Date(),
        totalPrice: 3000,
        isPaid: true,
        paymentStatus: "PENDING",
        isDelivered: false,
        orderitems: [{ isDelivered: true }, { isDelivered: false }],
      },
    ],
  });
  const html = renderToStaticMarkup(
    await BuyerOrders({ searchParams: Promise.resolve({ page: "1" }) }),
  );
  expect(html).toContain("Umelipa");
  expect(html).not.toContain("Inasubiri");
  expect(html).toContain("Zilizopokelewa: 1/2");
});

test("unavailable seller data never renders zero balances or empty-history claims", async () => {
  getOrderSummary.mockResolvedValue({
    available: false,
    totalSales: 0,
    salesData: [],
    salesByDayData: [],
    latestSales: [],
  });
  const html = renderToStaticMarkup(await SupplierOverview());
  expect(html).toContain("Muhtasari haupatikani kwa sasa");
  expect(html).not.toContain("Hakuna maagizo");
  expect(html).not.toContain("Escrow Pending");
});
