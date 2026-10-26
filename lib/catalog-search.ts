// URL values must never become fractional/non-finite Prisma offsets or prices.
export function catalogPage(value: unknown): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 1_000_000 ? page : 1;
}

export function catalogPriceRange(value?: string) {
  if (!value || value === "all") return undefined;
  const match = /^(\d+(?:\.\d{1,2})?)-(\d+(?:\.\d{1,2})?)$/.exec(value);
  if (!match) return undefined;
  const [gte, lte] = [Number(match[1]), Number(match[2])];
  if (!Number.isFinite(gte) || !Number.isFinite(lte) || gte > lte) return undefined;
  return { gte, lte };
}

export function catalogRating(value?: string) {
  if (!value || value === "all") return undefined;
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : undefined;
}

export function catalogParam(value: string | string[] | undefined, fallback: string): string {
  return (Array.isArray(value) ? value[0] : value) ?? fallback;
}
