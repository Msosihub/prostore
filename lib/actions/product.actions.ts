"use server";

import {
  catalogPage,
  catalogPriceRange,
  catalogRating,
} from "@/lib/catalog-search";
import {
  visibleCatalogProduct,
  publicSupplierSelect,
} from "@/lib/catalog-visibility";
import { prisma } from "@/db/prisma";
import { convertToPlainObject } from "../utils";
import { LATEST_PRODUCTS_LIMIT, PAGE_SIZE } from "../constants";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import {
  CatalogError,
  writeCatalogProduct,
  removeCatalogProduct,
  readCatalogEditor,
} from "@/lib/catalog-write";
import { insertProductSchema, updateProductSchema } from "../validators";
// import NextAuth from "next-auth";
import { NextResponse } from "next/server";
//import { Product } from "@/types";

// lib/actions/product.actions.ts

// lib/actions/product.actions.ts

export async function getProductsByCategoryID(
  categoryId: string,
  page = 1,
  limit = 20,
) {
  try {
    const products = await prisma.product.findMany({
      where: {
        ...visibleCatalogProduct,
        categoryId,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true, // optional if you want category details
        brand: true, // optional if you want brand details
        subcategory: true,
        supplier: { select: publicSupplierSelect },
      },
    });

    const totalCount = await prisma.product.count({
      where: { ...visibleCatalogProduct, categoryId },
    });

    return {
      products,
      totalCount,
      hasMore: page * limit < totalCount,
    };
  } catch (error) {
    console.error("Error fetching products by category: ", error);
    throw error;
  }
}

//get product by Category ID
export const getProductsByCategory = async (
  categoryId: string,
  excludeSlug?: string,
) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        ...visibleCatalogProduct,
        categoryId,
        slug: excludeSlug ? { not: excludeSlug } : undefined,
        //status: "PUBLISHED", // optional: filter only active products
      },
      orderBy: {
        createdAt: "desc", // optional: newest first
      },
      take: 8, // limit results
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        stock: true,
        images: true,
        isFeatured: true,
        banner: true,
        price: true,
        rating: true,
        numReviews: true,
        createdAt: true,
        pricingTiers: true,
        brand: true,
        category: true,
        subcategory: true,
        supplier: { select: publicSupplierSelect },
      },
    });

    return convertToPlainObject(products);
  } catch (error) {
    console.error("Error fetching related products:", error);
    return [];
  }
};

//Get Latest Products
export async function getLatestProducts() {
  try {
    const data = await prisma.product.findMany({
      where: visibleCatalogProduct,
      take: LATEST_PRODUCTS_LIMIT,
      orderBy: { createdAt: "desc" },
      include: {
        brand: { select: { name: true } },
        category: { select: { name_en: true, name_sw: true } },
        subcategory: { select: { name_en: true, name_sw: true } },
        supplier: { select: { companyName: true } },
        pricingTiers: {
          orderBy: { minQty: "asc" },
        },
      },
    });
    if (!data) return undefined;
    return convertToPlainObject(data);
  } catch (error) {
    console.log("Error fetching latest Products", error);
    return null;
  }
}

//Get single product by slug (now renamed to id)

export async function getProductBySlug(slug: string) {
  try {
    const data = await prisma.product.findFirst({
      where: {
        slug: slug,
        supplier: {
          OR: [
            { registration: null },
            { registration: { state: "APPROVED" }, isVerified: true },
          ],
        },
      },
      include: {
        category: {
          select: {
            name_en: true,
            name_sw: true,
          },
        },
        brand: {
          select: {
            name: true,
          },
        },
        pricingTiers: {
          orderBy: { minQty: "asc" },
        },
        supplier: { select: publicSupplierSelect },
        // videoUrl,
      },
    });

    if (!data) {
      // Product truly not found
      return undefined;
    }

    return convertToPlainObject(data);
  } catch (error) {
    console.error("❌ DB error in getProductBySlug:", error);
    // Network/DB/server failure
    return null; // <— so page can show "no internet" UI
  }
}

// Get single product by it's ID
export async function getProductById(productId: string) {
  return convertToPlainObject(await readCatalogEditor(productId));
}

// Delete a product
export async function deleteProduct(id: string) {
  try {
    await removeCatalogProduct(id);
    revalidatePath("/supplier/products");
    revalidatePath("/search");
    return { success: true, message: "Product deleted successfully" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof CatalogError
          ? error.message
          : "Unable to delete product. Referenced products must be retained",
    };
  }
}

export async function getAllCategories() {
  try {
    const data = await prisma.category.findMany({
      orderBy: { name_en: "asc" },
      select: {
        id: true,
        name_en: true,
        name_sw: true,
        _count: { select: { products: true } },
      },
    });

    if (!data) return NextResponse.json("Cant fetch categories");

    return data;
  } catch (error) {
    console.log("Error fetching Categories", error);
    return null;
  }
}

//* Get featured products
export async function getFeaturedProducts() {
  try {
    const data = await prisma.product.findMany({
      where: { ...visibleCatalogProduct, isFeatured: true },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: {
        brand: { select: { name: true } },
        category: { select: { name_en: true, name_sw: true } },
        subcategory: { select: { name_en: true, name_sw: true } },
        supplier: { select: { companyName: true } },
        pricingTiers: {
          orderBy: { minQty: "asc" },
        },
      },
    });

    if (!data) return undefined;

    return convertToPlainObject(data);
  } catch (error) {
    console.log("Error getting Featured products", error);
    return null;
  }
}

// Get all products
async function readProducts(
  {
    query,
    limit = PAGE_SIZE,
    page,
    category,
    price,
    rating,
    sort,
    supplierId,
  }: {
    query: string;
    limit?: number;
    page: number;
    category?: string;
    price?: string;
    rating?: string;
    sort?: string;
    supplierId?: string;
  },
  management = false,
) {
  const priceRange = catalogPriceRange(price);
  const minimumRating = catalogRating(rating);
  const safeLimit =
    Number.isSafeInteger(limit) && limit > 0 && limit <= 100
      ? limit
      : PAGE_SIZE;
  // Build unified filter
  const where: Prisma.ProductWhereInput = {
    ...(management ? {} : visibleCatalogProduct),
    ...(query && query !== "all"
      ? {
          name: {
            contains: query,
            mode: "insensitive",
          },
        }
      : {}),
    ...(category && category !== "all"
      ? {
          category: {
            name_en: category,
          },
        }
      : {}),
    ...(priceRange ? { price: priceRange } : {}),
    ...(minimumRating !== undefined ? { rating: { gte: minimumRating } } : {}),
    ...(supplierId && supplierId !== "all"
      ? {
          supplierId,
        }
      : {}),
  };

  // Fetch paginated products
  const data = await prisma.product.findMany({
    where,
    orderBy:
      sort === "lowest"
        ? { price: "asc" }
        : sort === "highest"
          ? { price: "desc" }
          : sort === "rating"
            ? { rating: "desc" }
            : { createdAt: "desc" },
    skip: (catalogPage(page) - 1) * safeLimit,
    take: safeLimit,
    include: {
      brand: { select: { name: true } },
      category: { select: { name_en: true, name_sw: true } },
      subcategory: { select: { name_en: true, name_sw: true } },
      supplier: { select: { companyName: true } },
      pricingTiers: {
        orderBy: { minQty: "asc" },
      },
    },
  });

  // Count total matching products
  const dataCount = await prisma.product.count({ where });
  return {
    data,
    totalPages: Math.ceil(dataCount / safeLimit),
  };
}

// Create a product
export async function createProduct(data: z.infer<typeof insertProductSchema>) {
  try {
    const product = await writeCatalogProduct(data, false);
    revalidatePath("/supplier/products");
    revalidatePath("/search");
    return {
      success: true,
      message: "Product created successfully",
      product: convertToPlainObject(product),
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof CatalogError
          ? error.message
          : "Unable to save product. Check the fields and try again",
    };
  }
}
export async function updateProduct(data: z.infer<typeof updateProductSchema>) {
  try {
    await writeCatalogProduct(data, true);
    revalidatePath("/supplier/products");
    revalidatePath("/search");
    return { success: true, message: "Product updated successfully" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof CatalogError
          ? error.message
          : "Unable to save product. Check the fields and try again",
    };
  }
}

export async function suppliersCount() {
  // let count = 0;
  try {
    const count = await prisma.supplier.count({
      where: {
        // isVerified: true,
        products: {
          some: {}, // means at least 1 product
        },
      },
    });

    return count;
  } catch (error) {
    console.log("SUPPLIER COUT ERROR", error);
    return 0;
  }
}

//brand create
export async function createBrandAction(name: string) {
  try {
    await requireAdmin();
    name = z.string().trim().min(1).max(100).parse(name);
    const brand = await prisma.brand.create({
      data: { name },
      select: { id: true, name: true },
    });
    return { success: true, data: brand, message: "Brand created" };
  } catch {
    return { success: false, message: "Failed to create brand" };
  }
}
export async function companyLatestProducts(supplierId: string) {
  const latestProducts = await prisma.product.findMany({
    where: { ...visibleCatalogProduct, supplierId: supplierId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  return convertToPlainObject(latestProducts);
}
//category create
export async function createCategoryAction(name_en: string) {
  const name_sw = name_en;
  try {
    await requireAdmin();
    name_en = z.string().trim().min(1).max(100).parse(name_en);
    const category = await prisma.category.create({
      data: { name_en, name_sw },
      select: { id: true, name_en: true },
    });
    return { success: true, data: category, message: "Category created" };
  } catch {
    return {
      success: false,
      message: "Failed to create category",
    };
  }
}

export async function getAllProducts(
  input: Parameters<typeof readProducts>[0],
) {
  return readProducts(input);
}
export async function getManagedProducts(
  input: Parameters<typeof readProducts>[0],
) {
  const session = await (await import("@/auth")).auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role === "ADMIN") return readProducts(input, true);
  if (user?.role !== "SUPPLIER") throw new Error("Unauthorized");
  const supplier = await prisma.supplier.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!supplier || (input.supplierId && input.supplierId !== supplier.id))
    throw new Error("Unauthorized");
  return readProducts({ ...input, supplierId: supplier.id }, true);
}
