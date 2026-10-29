import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ShoppingLoading from "@/components/storefront/shopping-loading";
import CatalogImage, {
  catalogImageSource,
} from "@/components/storefront/catalog-image";
import CatalogError from "@/app/(root)/error";
test("loading exposes honest status and decorative reduced-motion skeletons, without fake progress", () => {
  const html = renderToStaticMarkup(<ShoppingLoading />);
  expect(html).toContain('role="status"');
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain("motion-reduce:animate-none");
  expect(html).not.toContain("loader.gif");
  expect(html).not.toContain("progressbar");
  expect(html).not.toContain("Pakia tena");
});
test.each([
  "/images/sample-products/p1-1.jpg",
  "https://utfs.io/f/catalog",
  "http://static.photos/100",
  "https://i.ytimg.com/image",
])("configured catalog image is preserved: %s", (src) =>
  expect(catalogImageSource(src)).toBe(src),
);
test.each([
  "javascript:alert(1)",
  "https://evil.example/x",
  "https://utfs.io:444/x",
  "https://name:password@utfs.io/x",
  "/images/../private",
  "//evil.example/x",
  "/images/\\evil",
  undefined,
])("invalid catalog image becomes neutral placeholder: %s", (src) => {
  expect(catalogImageSource(src)).toBeUndefined();
  expect(
    renderToStaticMarkup(
      <CatalogImage src={src} alt="Product" sizes="100vw" />,
    ),
  ).toContain("Picha haipatikani");
});
test("catalog failure offers recovery and direct own-cart/order navigation", () => {
  const html = renderToStaticMarkup(<CatalogError reset={() => {}} />);
  expect(html).toContain("Jaribu tena");
  expect(html).toContain('href="/cart"');
  expect(html).toContain('href="/user/orders"');
});
