import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import OperationalBookNotice from "@/components/operational-book-notice";
const before = process.env.NEXT_PUBLIC_CATALOG_RELAUNCH;
afterEach(() => {
  if (before === undefined) delete process.env.NEXT_PUBLIC_CATALOG_RELAUNCH;
  else process.env.NEXT_PUBLIC_CATALOG_RELAUNCH = before;
});
test("disabled unless explicitly activated", () => {
  delete process.env.NEXT_PUBLIC_CATALOG_RELAUNCH;
  expect(renderToStaticMarkup(<OperationalBookNotice />)).toBe("");
  process.env.NEXT_PUBLIC_CATALOG_RELAUNCH = "false";
  expect(renderToStaticMarkup(<OperationalBookNotice />)).toBe("");
});
test("new book notice preserves historical obligations explicitly", () => {
  process.env.NEXT_PUBLIC_CATALOG_RELAUNCH = "true";
  const html = renderToStaticMarkup(<OperationalBookNotice />);
  expect(html).toContain("historical obligations have not been cancelled");
  expect(html).toContain(
    "Earlier orders, returns and balances remain separate",
  );
});
