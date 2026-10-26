jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.fn((value) => [value, jest.fn()]),
  useTransition: () => [false, (fn) => fn()],
}));
jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
jest.mock("@/lib/actions/order-notification.actions", () => ({
  retryOrderNotification: jest.fn(),
}));
import { useRouter } from "next/navigation";
import { retryOrderNotification } from "@/lib/actions/order-notification.actions";
import NotificationRetry from "@/components/admin/notification-retry";
function button(node) {
  if (node?.type === "button") return node;
  for (const child of [node?.props?.children].flat(Infinity)) {
    const found = child && typeof child === "object" ? button(child) : null;
    if (found) return found;
  }
  return null;
}
test("confirmed retry explicitly refreshes authoritative router data", async () => {
  const refresh = jest.fn();
  useRouter.mockReturnValue({ refresh });
  retryOrderNotification.mockResolvedValue({
    success: true,
    message: "Queued",
  });
  await button(
    NotificationRetry({ id: "fixture", unknown: false }),
  ).props.onClick();
  expect(retryOrderNotification).toHaveBeenCalledWith({
    id: "fixture",
    acknowledgeUnknown: false,
  });
  expect(refresh).toHaveBeenCalledTimes(1);
});
test("rejected retry does not claim or optimistically remove queued data", async () => {
  const refresh = jest.fn();
  useRouter.mockReturnValue({ refresh });
  retryOrderNotification.mockResolvedValue({
    success: false,
    message: "Rejected",
  });
  await button(
    NotificationRetry({ id: "fixture", unknown: false }),
  ).props.onClick();
  expect(refresh).not.toHaveBeenCalled();
});
