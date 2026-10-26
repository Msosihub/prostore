jest.mock("query-string", () => ({ __esModule: true, default: {} }));
jest.mock("@/db/prisma", () => ({ prisma: { product: { findMany: jest.fn(), count: jest.fn() } } }));
import { prisma } from "@/db/prisma";
import { getAllProducts } from "@/lib/actions/product.actions";
import { catalogPage, catalogPriceRange, catalogRating, catalogParam } from "@/lib/catalog-search";
test.each(["1.5", "Infinity", "-1", "NaN", "100000000000000000", undefined])("invalid page %s resets safely", value => {
 expect(catalogPage(value)).toBe(1);
});
test("valid filters retain decimal prices and rating", () => {
 expect(catalogPage("3")).toBe(3);
 expect(catalogPriceRange("10.50-20.75")).toEqual({gte:10.5,lte:20.75});
 expect(catalogRating("4")).toBe(4);
});
test.each(["invalid", "10-1", "Infinity-20", "1-NaN"])("invalid price %s ignored", v => expect(catalogPriceRange(v)).toBeUndefined());
test("invalid URL filters never reach Prisma numeric arguments", async () => {
 prisma.product.findMany.mockResolvedValue([]); prisma.product.count.mockResolvedValue(0);
 await getAllProducts({query:"test",page:Infinity,limit:-5,price:"broken",rating:"NaN"});
 const args=prisma.product.findMany.mock.calls[0][0];
 expect(args.skip).toBe(0); expect(args.take).toBeGreaterThan(0);
 expect(args.where.price).toBeUndefined(); expect(args.where.rating).toBeUndefined();
});

test("repeated query keys select the first scalar consistently with URLSearchParams", () => {
 expect(catalogParam(["Test", "other"], "all")).toBe("Test");
 expect(catalogParam(undefined, "all")).toBe("all");
});
