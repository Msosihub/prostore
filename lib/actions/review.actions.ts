"use server";

import { z } from "zod";
import { insertReviewSchema } from "../validators";
import { formatError } from "../utils";
import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { revalidatePath } from "next/cache";
import { moderateReviewText } from "./review-moderation";

// Create & Update Reviews
// export async function createUpdateReview(
//   data: z.infer<typeof insertReviewSchema>
// ) {
//   try {
//     const session = await auth();
//     if (!session) throw new Error("User is not authenticated");

//     // Validate and store the review
//     const review = insertReviewSchema.parse({
//       ...data,
//       userId: session?.user?.id,
//     });

//     // Get product that is being reviewed
//     const product = await prisma.product.findFirst({
//       where: { id: review.productId },
//     });

//     if (!product) throw new Error("Product not found");

//     // Check if user already reviewed
//     const reviewExists = await prisma.review.findFirst({
//       where: {
//         productId: review.productId,
//         userId: review.userId,
//       },
//     });

//     await prisma.$transaction(async (tx) => {
//       if (reviewExists) {
//         // Update review
//         await tx.review.update({
//           where: { id: reviewExists.id },
//           data: {
//             title: review.title,
//             description: review.description,
//             rating: review.rating,
//           },
//         });
//       } else {
//         // Create review
//         await tx.review.create({ data: review });
//       }

//       // Get avg rating
//       const averageRating = await tx.review.aggregate({
//         _avg: { rating: true },
//         where: { productId: review.productId },
//       });

//       // Get number of reviews
//       const numReviews = await tx.review.count({
//         where: { productId: review.productId },
//       });

//       // Update the rating and numReviews in product table
//       await tx.product.update({
//         where: { id: review.productId },
//         data: {
//           rating: averageRating._avg.rating || 0,
//           numReviews,
//         },
//       });
//     });

//     revalidatePath(`/product/${product.slug}`);

//     return {
//       success: true,
//       message: "Review Updated Successfully",
//     };
//   } catch (error) {
//     return { success: false, message: formatError(error) };
//   }
// }

// Get all reviews for a product

export async function createUpdateReview(
  data: z.infer<typeof insertReviewSchema>
) {
  try {
    const session = await auth();
    if (!session) throw new Error("User is not authenticated");

    // 1. Validate incoming data payloads against zod schema definitions
    const review = insertReviewSchema.parse({
      ...data,
      userId: session.user?.id,
    });

    console.log("DAATAAAA: ", data);

    // 2. 🟢 INTEGRATE OPENAI: Intercept input text for strict content policy verification checks
    const moderation = await moderateReviewText(
      review.description,
      review.title
    );
    console.log("Data: ", review.description, review.title);
    console.log("Moderaation: ", moderation);

    if (!moderation.isAllowed) {
      return {
        success: false,
        message: moderation.reason, // Transmits Swahili instructions directly back to form UI
      };
    }

    const product = await prisma.product.findFirst({
      where: { id: review.productId },
    });

    if (!product) throw new Error("Product not found");

    const reviewExists = await prisma.review.findFirst({
      where: {
        productId: review.productId,
        userId: review.userId,
      },
    });

    await prisma.$transaction(async (tx) => {
      if (reviewExists) {
        await tx.review.update({
          where: { id: reviewExists.id },
          data: {
            title: review.title,
            description: review.description,
            rating: review.rating,
          },
        });
      } else {
        // Look up previous transaction row items to append the trust emblem verified flag
        const completedOrder = await tx.order.findFirst({
          where: {
            userId: review.userId,
            paymentStatus: "COMPLETED",
            orderitems: { some: { productId: review.productId } },
          },
        });

        await tx.review.create({
          data: {
            ...review,
            isVerifiedPurchase: !!completedOrder,
          },
        });
      }

      const averageRating = await tx.review.aggregate({
        _avg: { rating: true },
        where: { productId: review.productId },
      });

      const numReviews = await tx.review.count({
        where: { productId: review.productId },
      });

      await tx.product.update({
        where: { id: review.productId },
        data: {
          rating: averageRating._avg.rating || 0,
          numReviews,
        },
      });
    });

    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: "Maoni yako yamehifadhiwa vyema!",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

export async function getReviews({ productId }: { productId: string }) {
  try {
    const data = await prisma.review.findMany({
      where: {
        productId: productId,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { data };
  } catch (error) {
    console.log("Error fetching Reviews", error);
    return null;
  }
}

// Get a review written by the current user
export async function getReviewByProductId({
  productId,
}: {
  productId: string;
}) {
  const session = await auth();

  if (!session) throw new Error("User is not authenticated");

  return await prisma.review.findFirst({
    where: {
      productId,
      userId: session?.user?.id,
    },
  });
}
