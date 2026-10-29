// Legacy suppliers keep existing visibility. New applications publish only after approval.
export const visibleSeller = {
  OR: [
    { registration: null },
    { registration: { state: "APPROVED" }, isVerified: true },
  ],
};
export const visibleCatalogProduct = { supplier: visibleSeller };
export const publicSupplierSelect = {
  id: true,
  userId: true,
  name: true,
  companyName: true,
  username: true,
  logo: true,
  isVerified: true,
};
