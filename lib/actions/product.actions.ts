"use server";
import { prisma } from "@/db/prisma";
import { convertToPlainObject, formatError } from "../utils";
import { LATEST_PRODUCTS_LIMIT, PAGE_SIZE } from "../constants";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { insertProductSchema, updateProductSchema } from "../validators";
// import NextAuth from "next-auth";
import { NextResponse } from "next/server";
//import { Product } from "@/types";

// lib/actions/product.actions.ts

// lib/actions/product.actions.ts

export async function getProductsByCategoryID(
  categoryId: string,
  page = 1,
  limit = 20
) {
  try {
    const products = await prisma.product.findMany({
      where: {
        categoryId,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        category: true, // optional if you want category details
        brand: true, // optional if you want brand details
        subcategory: true,
        supplier: true,
      },
    });

    const totalCount = await prisma.product.count({
      where: { categoryId },
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
  excludeSlug?: string
) => {
  try {
    const products = await prisma.product.findMany({
      where: {
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
        supplier: true,
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

export async function getProductBySlug(id: string) {
  try {
    const data = await prisma.product.findFirst({
      where: { id: id },
      include: {
        category: {
          select: {
            name_en: true,
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
        supplier: {
          include: {
            certifications: true,
          },
        },
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
  const data = await prisma.product.findFirst({
    where: { id: productId },
    include: {
      pricingTiers: true,
    },
  });

  return convertToPlainObject(data);
}

// Delete a product
export async function deleteProduct(id: string) {
  try {
    const productExists = await prisma.product.findFirst({
      where: { id },
    });

    if (!productExists) throw new Error("Product not found");

    await prisma.product.delete({ where: { id } });

    revalidatePath("/admin/products");

    return {
      success: true,
      message: "Product deleted successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get all categories
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
      where: { isFeatured: true },
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
export async function getAllProducts({
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
}) {
  // Build unified filter
  const where: Prisma.ProductWhereInput = {
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
    ...(price && price !== "all"
      ? {
          price: {
            gte: Number(price.split("-")[0]),
            lte: Number(price.split("-")[1]),
          },
        }
      : {}),
    ...(rating && rating !== "all"
      ? {
          rating: {
            gte: Number(rating),
          },
        }
      : {}),
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
    skip: (page - 1) * limit,
    take: limit,
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
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Create a product
export async function createProduct(data: z.infer<typeof insertProductSchema>) {
  try {
    const parsed = insertProductSchema.parse(data);

    const {
      name,
      slug,
      description,
      images,
      price,
      stock,

      brandId,
      categoryId,
      subcategoryId,
      supplierId,
      pricingTiers,
    } = parsed;

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        images,
        price,
        color: "",
        size: "",
        stock,
        brandId,
        categoryId,
        subcategoryId,
        supplierId,
        pricingTiers: {
          create: pricingTiers.map((tier) => ({
            minQty: tier.minQty,
            price: tier.price,
          })),
        },
      },
    });

    revalidatePath("/admin/products");

    return {
      success: true,
      message: "Product created successfully",
      product: convertToPlainObject(product),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update a product
export async function updateProduct(data: z.infer<typeof updateProductSchema>) {
  try {
    const parsed = updateProductSchema.parse(data);

    const {
      id,
      name,
      slug,
      description,
      images,

      price,
      stock,

      brandId,
      categoryId,
      subcategoryId,
      supplierId,
      pricingTiers,
    } = parsed;

    const productExists = await prisma.product.findUnique({ where: { id } });
    if (!productExists) throw new Error("Product not found");

    await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        images,
        price,
        color: "",
        size: "",
        stock,
        brandId,
        categoryId,
        subcategoryId,
        supplierId,
      },
    });

    // Optional: Replace pricing tiers
    await prisma.productPricing.deleteMany({ where: { productId: id } });
    await prisma.productPricing.createMany({
      data: pricingTiers.map((tier) => ({
        productId: id,
        minQty: tier.minQty,
        price: tier.price,
      })),
    });

    revalidatePath("/admin/products");

    return {
      success: true,
      message: "Product updated successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
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

    console.log("Suppliers with at least 1 product:", count);

    return count;
  } catch (error) {
    console.log("SUPPLIER COUT ERROR", error);
    return 0;
  }
}

//brand create
export async function createBrandAction(name: string) {
  try {
    const brand = await prisma.brand.create({
      data: { name },
      select: { id: true, name: true },
    });
    return { success: true, data: brand, message: "Brand created" };
  } catch (e) {
    return { success: false, message: e ?? "Failed to create brand" };
  }
}
export async function companyLatestProducts(supplierId: string) {
  const latestProducts = await prisma.product.findMany({
    where: { supplierId: supplierId },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  return convertToPlainObject(latestProducts);
}
//category create
export async function createCategoryAction(name_en: string) {
  const name_sw = name_en;
  try {
    const category = await prisma.category.create({
      data: { name_en, name_sw },
      select: { id: true, name_en: true },
    });
    return { success: true, data: category, message: "Category created" };
  } catch (e) {
    return {
      success: false,
      message: e ?? "Failed to create category",
    };
  }
}
