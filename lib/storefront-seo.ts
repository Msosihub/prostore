// Shared, side-effect-free URL/markup rules. No provider or private profile fields.
export function siteOrigin() {
  try {
    const url = new URL(
      process.env.NEXT_PUBLIC_SERVER_URL || "https://nimboya.com",
    );
    if (!["https:", "http:"].includes(url.protocol)) throw Error();
    return url.origin;
  } catch {
    return "https://nimboya.com";
  }
}
export const publicUrl = (path: string) =>
  new URL(path, siteOrigin()).toString();
export const productPath = (slug: string) =>
  `/product/${encodeURIComponent(slug)}`;
export const sellerPath = (id: string) =>
  `/company/${encodeURIComponent(id)}/home`;
export const jsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");
export const plainDescription = (value: string, limit = 160) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
export function isPublicProduct(p: {
  name: string;
  slug: string;
  price: unknown;
}) {
  return (
    !!p.name.trim() &&
    !!p.slug.trim() &&
    Number.isFinite(Number(p.price)) &&
    Number(p.price) > 0
  );
}
export function unitPrice(p: {
  price: unknown;
  pricingTiers?: { minQty: number; price: unknown }[];
}) {
  const tier = p.pricingTiers
    ?.filter(
      (t) =>
        Number.isSafeInteger(t.minQty) && t.minQty === 1 && Number(t.price) > 0,
    )
    .at(-1);
  return Number(tier?.price ?? p.price);
}
export function imageUrl(value?: string | null) {
  if (!value) return undefined;
  try {
    const u = new URL(value, siteOrigin());
    return ["https:", "http:"].includes(u.protocol) ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
export function productStructuredData(p: {
  name: string;
  slug: string;
  description: string;
  images: string[];
  price: unknown;
  stock: number;
  pricingTiers?: { minQty: number; price: unknown }[];
  brand?: { name: string } | null;
}) {
  if (!isPublicProduct(p)) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    url: publicUrl(productPath(p.slug)),
    description: plainDescription(p.description, 1000),
    image: p.images.map(imageUrl).filter(Boolean),
    ...(p.brand?.name
      ? { brand: { "@type": "Brand", name: p.brand.name } }
      : {}),
    offers: {
      "@type": "Offer",
      url: publicUrl(productPath(p.slug)),
      priceCurrency: "TZS",
      price: unitPrice(p).toFixed(2),
      availability: `https://schema.org/${p.stock > 0 ? "InStock" : "OutOfStock"}`,
    },
  };
}
export function noindexPath(pathname: string) {
  return /^\/(api|admin|supplier|buyer|user|order|cart|shipping-address|payment-method|place-order2?|onboarding|sign-in|unauthorized|test|profile)(\/|$)/.test(
    pathname,
  );
}
export function demoOrigin(host: string) {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.SITE_NOINDEX === "true"
  );
}
export const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Next's App Router supplies URI-encoded dynamic segment values. Decode once at
// the route boundary, never inside shared database lookup actions.
export function productSlugFromParam(value: string): string | undefined {
  try {
    const slug = decodeURIComponent(value);
    if (
      !slug ||
      slug === "." ||
      slug === ".." ||
      /[/\\\u0000-\u001f\u007f]/.test(slug)
    )
      return undefined;
    return slug;
  } catch {
    return undefined;
  }
}
