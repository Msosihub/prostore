"use server";

import {
  shippingAddressSchema,
  signInFormSchema,
  signUpFormSchema,
  paymentMethodSchema,
  updateUserSchema,
} from "../validators";
import { auth, signIn, signOut } from "@/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { prisma } from "@/db/prisma";
import { formatError } from "../utils";
import { ShippingAddress } from "@/types";
import { z } from "zod";
import { PAGE_SIZE } from "../constants";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getMyCart } from "./cart.actions";
import { hashSync } from "bcrypt-ts-edge";

// Sign in the user with credentials
export async function signInWithCredentials(
  prevState: unknown,
  formData: FormData
) {
  try {
    const user = signInFormSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    console.log("Data in SignIn: ", user);

    await signIn("credentials", user);

    return { success: true, message: "Signed in successfully" };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: "Invalid email or password" };
  }
}
// Sign in the user with credentials
// export async function signInWithCredentials2(
//   prevState: unknown,
//   formData: FormData
// ) {
//   try {
//     const user = signInFormSchema.parse({
//       identifier: formData.get("identifier"),
//       password: formData.get("password"),
//     });
//     const res = await signIn("credentials", {
//       redirect: false,
//       email: user.identifier,
//       password: user.password,
//     });

//     await signIn("credentials", user);

//     return { success: true, message: "Signed in successfully" };
//   } catch (error) {
//     if (isRedirectError(error)) {
//       throw error;
//     }
//     return { success: false, message: "Invalid email or password" };
//   }
// }
// Sign user out
export async function signOutUser() {
  // get current users cart and delete it so it does not persist to next user
  const currentCart = await getMyCart();

  if (currentCart?.id) {
    await prisma.cart.delete({ where: { id: currentCart.id } });
  } else {
    console.warn("No cart found for deletion.");
  }
  await signOut();
}

// Sign up user
export async function signUpUser(prevState: unknown, formData: FormData) {
  console.log("In SignUp Action - formData:", formData);
  console.log(
    "In SignUp Action - formData email:",
    formData.get("phoneNormalized")
  );
  console.log("In SignUp Action - formData email:", formData.get("role"));
  // console.log("In SignUp Action - formData email:", formData.get("email"));
  try {
    const user = signUpFormSchema.parse({
      name: formData.get("name"),
      email: formData.get("email") || "",
      phone: formData.get("phoneNormalized"),
      country: formData.get("country"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      role: formData.get("role"),
    });

    const plainPassword = user.password;
    if (user.password !== user.confirmPassword) {
      return { success: false, message: "Passwords do not match." };
    }

    const hashedPassword = await hashSync(user.password, 10);
    user.password = hashedPassword;

    const phoneNormalized =
      (formData.get("phoneNormalized") as string | null) ?? user.phone;
    let emailNormalized =
      ((formData.get("email") as string) || null) ?? user.email;
    emailNormalized = emailNormalized.toLowerCase().trim();

    const conditions: Prisma.UserWhereInput[] = [];

    if (emailNormalized) {
      conditions.push({ email: emailNormalized });
    }

    if (phoneNormalized) {
      conditions.push({ phone: phoneNormalized });
    }

    // check if user exists by phone OR email
    const existing = await prisma.user.findFirst({
      where: {
        OR: conditions.length > 0 ? conditions : undefined,
      },
      select: { id: true, email: true, phone: true },
    });

    if (existing) {
      throw new Error(
        "Akaunti tayari ipo na nambari hii ya simu/barua pepe. Tafadhali ingia badala yake."
      );
    }

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: user.name,
          email: user?.email || "",
          phone: phoneNormalized,
          location: user.country || "Tanzania",
          // country: user.country || "Tanzania",
          password: hashedPassword,
          role: user.role,
          isVerified: true, // OTP already verified on client
        },
      });

      //if a supplier is created, create a supplier profile as well
      if (newUser.role === "SUPPLIER") {
        await tx.supplier.create({
          data: {
            userId: newUser.id,
            name: newUser.name,
            email: newUser.email || "",
            companyName: "New Supplier Co.",
            location: "Dar es Salaam",
            // nation: newUser.country || "Tanzania",
            yearsActive: 1,
            isVerified: false,
            rating: 0,
            deliveryRate: 0,
          },
        });
      }
    });

    // await signIn("credentials", {
    //   email: user.email,
    //   password: plainPassword,
    // });

    // Auto-login (your credentials provider expects "identifier")
    await signIn("credentials", {
      identifier: user?.email || phoneNormalized,
      password: plainPassword,
      redirect: true, // let client do the redirect using callbackUrl
    });

    return { success: true, message: "User registered successfully" };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return { success: false, message: formatError(error) };
  }
}

// Get user by the ID
export async function getUserById(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
  });
  if (!user) throw new Error("User not found");
  return user;
}

// Update the user's address
export async function updateUserAddress(data: ShippingAddress) {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id },
    });

    if (!currentUser) throw new Error("User not found");

    const address = shippingAddressSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { address },
    });

    return {
      success: true,
      message: "User updated successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update user's payment method
export async function updateUserPaymentMethod(
  data: z.infer<typeof paymentMethodSchema>
) {
  try {
    const session = await auth();
    const currentUser = await prisma.user.findFirst({
      where: { id: session?.user?.id },
    });

    if (!currentUser) throw new Error("User not found");

    const paymentMethod = paymentMethodSchema.parse(data);

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { paymentMethod: paymentMethod.type },
    });

    return {
      success: true,
      message: "User updated successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update the user profile
export async function updateProfile(user: {
  name: string;
  email?: string;
  phone?: string;
}) {
  try {
    const session = await auth();

    const currentUser = await prisma.user.findFirst({
      where: {
        id: session?.user?.id,
      },
    });

    if (!currentUser) throw new Error("User not found");

    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        name: user.name,
      },
    });

    return {
      success: true,
      message: "User updated successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get all the users
export async function getAllUsers({
  limit = PAGE_SIZE,
  page,
  query,
}: {
  limit?: number;
  page: number;
  query: string;
}) {
  const queryFilter: Prisma.UserWhereInput =
    query && query !== "all"
      ? {
          name: {
            contains: query,
            mode: "insensitive",
          } as Prisma.StringFilter,
        }
      : {};

  const data = await prisma.user.findMany({
    where: {
      ...queryFilter,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.user.count();

  return {
    data,
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Delete a user
export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } });

    revalidatePath("/admin/users");

    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      message: formatError(error),
    };
  }
}

// enum UserRole {
//   BUYER,
//   SUPPLIER,
//   ADMIN,
// }

// Update a user
export async function updateUser(user: z.infer<typeof updateUserSchema>) {
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        role: user.role,
      },
    });

    revalidatePath("/admin/users");

    return {
      success: true,
      message: "User updated successfully",
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
