import {
  sellerApplication,
  shopPath,
  safeShopText,
} from "@/lib/seller-registration-policy";
const valid = {
  name: "Household shop",
  username: "household-shop",
  about: "Kitchen products",
  smsConsent: false,
};
test("minimal application retains explicit consent and stable shop path", () => {
  expect(sellerApplication.parse(valid)).toEqual(valid);
  expect(shopPath(valid.username, "id")).toBe("/shops/household-shop");
  expect(shopPath(null, "id")).toBe("/company/id/home");
});
test.each(["../store", "shop/name", "UPPERCASE", "x", "x--y", "x%2fy"])(
  "reject unsafe or noncanonical shop link %s",
  (username) =>
    expect(sellerApplication.safeParse({ ...valid, username }).success).toBe(
      false,
    ),
);
test.each([
  "+255 712 345 678",
  "hello@example.com",
  "<script>alert(1)</script>",
  "wa.me/255712345678",
])("public text cannot expose contact/markup %s", (about) => {
  expect(sellerApplication.safeParse({ ...valid, about }).success).toBe(false);
  expect(safeShopText(about)).toBe("");
});
test("unknown privilege fields are refused", () =>
  expect(
    sellerApplication.safeParse({ ...valid, isVerified: true }).success,
  ).toBe(false));
