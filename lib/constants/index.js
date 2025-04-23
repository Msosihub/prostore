export const APP_NAME = process.env.NEXT_PUBLIC_APP || "Prostore";
export const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION || "New One";
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
export const LATEST_PRODUCTS_LIMIT =
  Number(process.env.LATEST_PRODUCTS_LIMIT) || 8;

export const signInDefaultValues = {
  email: "hp@gmail.com",
  password: "123456",
};
export const signUpDefaultValues = {
  email: "hp@gmail.com",
  password: "",
  name: "",
  confirmPassword: "",
};

export const shippingAddressDefaultValues = {
  fullName: "",
  streetAddress: "",
  city: "",
  postalCode: "",
  country: "",
};
