// import { title } from "process";

export const APP_NAME = process.env.NEXT_PUBLIC_APP || "Nimboya";
export const SUPPLIER_URL =
  process.env.NEXT_PUBLIC_SUPPLIER_URL || "http://localhost:3000/suppliers";

export const CUSTOMER_URL =
  process.env.NEXT_PUBLIC_CUSTOMER_URL || "http://localhost:3000";
export const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3000/admin";

export const APP_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION || "New One";
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
export const LATEST_PRODUCTS_LIMIT =
  Number(process.env.LATEST_PRODUCTS_LIMIT) || 8;

export const signInDefaultValues = {
  email: "jane@example.com / +255 760 000 000",
  password: "",
};

export const signUpDefaultValues = {
  email: "jane@example.com",
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

export const reviewFormDefaultValues = {
  title: "",
  description: "",
  productId: "",
  userId: "",
  rating: 0,
  comment: "",
};

export const PAYMENT_METHODS = process.env.PAYMENT_METHODS
  ? process.env.PAYMENT_METHODS.split(",")
  : ["Endelea", "Endele"];

export const DEFAULT_PAYMENT_METHOD =
  process.env.DEFAULT_PAYMENT_METHOD || "Endelea";

export const PAGE_SIZE = 14;

export const productDefaultValues = {
  name: "",
  slug: "",
  category: "",
  images: [],
  brand: "",
  description: "",
  price: "0",
  stock: 0,
  rating: "0",
  numReviews: "0",
  isFeatured: false,
  banner: null,
  pricingTiers: [],
};

export const USER_ROLES = process.env.USER_ROLES
  ? process.env.USER_ROLES.split(", ")
  : ["ADMIN", "BUYER", "SUPPLIER"];

// export const
export const SENDER_EMAIL = process.env.SENDER_EMAIL;

//PRODUCT/SLUG DAT LIMITS
export const MAX_DESCRIPTION_LENGTH = 650;
//for comment display
export const MAX_DESCRIPTION_LENGTH_COMMENT = 250;
export const INITIAL_COUNT_COMMENT = 4;
//for comments input form
export const TITLE_WORD_LIMIT_COMMENT = 8;
export const DESCRIPTION_WORD_LIMIT_COMMENT = 650;

// ---------- East Africa countries + dial codes ----------
export const EA_COUNTRIES = [
  { code: "TZ", name: "Tanzania", dial: "255" },
  { code: "KE", name: "Kenya", dial: "254" },
  { code: "UG", name: "Uganda", dial: "256" },
  { code: "RW", name: "Rwanda", dial: "250" },
  { code: "BI", name: "Burundi", dial: "257" },
  { code: "SS", name: "South Sudan", dial: "211" },
];

const defaultHours = [
  "Jumatatu",
  "Jumanne",
  "Jumatano",
  "Alhamisi",
  "Ijumaa",
  "Jumamosi",
  "Jumapili",
].map((day) => ({ day, open: "08:00", close: "18:30" }));
export const DEFAULT_WORKING_HOURS = defaultHours;
