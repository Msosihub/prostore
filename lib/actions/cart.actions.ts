"use server";
import { auth } from "@/auth";
import { CartItem } from "@/types";
import { cookies } from "next/headers";
import { convertToPlainObject, formatError, round2 } from "../utils";
import { cartItemSchema, insertCartSchema } from "../validators";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// Calculate cart prices
const calcPrice = (items: CartItem[]) => {
  const itemsPrice = round2(
      items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
    ),
    shippingPrice = round2(itemsPrice > 100 ? 0 : 10),
    taxPrice = round2(0.15 * itemsPrice),
    totalPrice = round2(itemsPrice + taxPrice + shippingPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};

export async function addItemToCart(data: CartItem) {
  try {
    //check for cart cookie
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart item not found");
    //get Session and user Id
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    const cart = await getMyCart();
    const item = cartItemSchema.parse(data);
    //find the cart item in the database
    const product = await prisma.product.findFirst({
      where: {
        id: item.productId,
      },
    });

    if (!product) throw new Error("Product not found");

    if (!cart) {
      // Create new cart object
      const newCart = insertCartSchema.parse({
        userId: userId,
        items: [item],
        sessionCartId: sessionCartId,
        ...calcPrice([item]),
      });

      // Add to database
      await prisma.cart.create({
        data: newCart,
      });

      // Revalidate product page
      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} added to cart`,
      };
    } else {
      // Check if item is already in cart
      const existItem = (cart.items as CartItem[]).find(
        (x) => x.productId === item.productId
      );

      if (existItem) {
        // Check stock
        if (product.stock < existItem.qty + 1) {
          throw new Error("Not enough stock");
        }

        // Increase the quantity
        (cart.items as CartItem[]).find(
          (x) => x.productId === item.productId
        )!.qty = existItem.qty + 1;
      } else {
        // If item does not exist in cart
        // Check stock
        if (product.stock < 1) throw new Error("Not enough stock");

        // Add item to the cart.items
        cart.items.push(item);
      }

      // Save to database
      await prisma.cart.update({
        where: { id: cart.id },
        data: {
          items: cart.items as Prisma.CartUpdateitemsInput[],
          ...calcPrice(cart.items as CartItem[]),
        },
      });

      revalidatePath(`/product/${product.slug}`);

      return {
        success: true,
        message: `${product.name} ${
          existItem ? "updated in" : "added to"
        } cart`,
      };
    }
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return {
      success: false,
      message: "Failed to add item to cart",
    };
  }
}

export async function getMyCart({
  isBuyNow = false,
}: { isBuyNow?: boolean } = {}) {
  try {
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart item not found");
    //get Session and user Id
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    //get cart cookie
    //pull the item from database

    const cart = await prisma.cart.findFirst({
      where: {
        ...(userId ? { userId } : { sessionCartId }),
        isBuyNow, // 🔑 ensures correct type of cart
      },
    });

    if (!cart) return undefined;

    //convert to decimal
    return convertToPlainObject({
      ...cart,
      items: cart.items as CartItem[],
      itemsPrice: cart.itemsPrice,
      totalPrice: cart.totalPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
    });
  } catch (error) {
    console.error("❌ DB error in getMyCart:", error);
    return undefined; // fallback
  }
}

export async function removeItemFromCart(productId: string) {
  try {
    // Check for cart cookie
    const sessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (!sessionCartId) throw new Error("Cart session not found");

    // Get Product
    const product = await prisma.product.findFirst({
      where: { id: productId },
    });
    if (!product) throw new Error("Product not found");

    // Get user cart
    const cart = await getMyCart();
    if (!cart) throw new Error("Cart not found");

    // Check for item
    const exist = (cart.items as CartItem[]).find(
      (x) => x.productId === productId
    );
    if (!exist) throw new Error("Item not found");

    // Check if only one in qty
    if (exist.qty === 1) {
      // Remove from cart
      cart.items = (cart.items as CartItem[]).filter(
        (x) => x.productId !== exist.productId
      );
    } else {
      // Decrease qty
      (cart.items as CartItem[]).find((x) => x.productId === productId)!.qty =
        exist.qty - 1;
    }

    // Update cart in database
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: cart.items as Prisma.CartUpdateitemsInput[],
        ...calcPrice(cart.items as CartItem[]),
      },
    });

    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: `${product.name} was removed from cart`,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function buyNowItem(data: CartItem) {
  try {
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    // 🔥 ensure only ONE BuyNow cart exists at a time
    const oldSessionCartId = (await cookies()).get("sessionCartId")?.value;
    if (oldSessionCartId) {
      await prisma.cart.deleteMany({
        where: { sessionCartId: oldSessionCartId, isBuyNow: true },
      });
    }

    // Force create a fresh cart (ignore existing one)
    const sessionCartId = crypto.randomUUID(); // temporary unique cart id
    (await cookies()).set("sessionCartId", sessionCartId);

    const item = cartItemSchema.parse(data);
    const product = await prisma.product.findFirst({
      where: { id: item.productId },
    });

    if (!product) throw new Error("Product not found");
    if (product.stock < 1) throw new Error("Not enough stock");

    const newCart = insertCartSchema.parse({
      userId,
      items: [item],
      sessionCartId,
      isBuyNow: true, // mark it
      ...calcPrice([item]),
    });

    await prisma.cart.create({
      data: newCart,
    });

    // ✅ instead of staying on product page → redirect to checkout
    revalidatePath(`/checkout/${sessionCartId}`);

    return {
      success: true,
      message: `${product.name} ready for checkout`,
      cartId: sessionCartId,
    };
  } catch (error) {
    console.error("Error in Buy Now:", error);
    return { success: false, message: "Failed to start Buy Now checkout" };
  }
}
