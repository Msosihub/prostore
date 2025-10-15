// // app/(root)/company/[supplierId]/home/page.tsx

// import { prisma } from "@/db/prisma"; // <- your prisma client
// import Image from "next/image";
// import Link from "next/link";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";

// export default async function SupplierHomePage({
//   params,
// }: {
//   params: Promise<{ supplierId: string }>;
// }) {
//   const paramsx = await params;
//   const supplierId = paramsx.supplierId;
//   const supplier = await prisma.supplier.findUnique({
//     where: { id: supplierId },
//     include: {
//       products: {
//         // where: { isFeatured: true }, //TODO: Enable this later
//         take: 6,
//       },
//     },
//   });

//   if (!supplier) {
//     return (
//       <div className="flex justify-center items-center h-96">
//         <p className="text-gray-600">Supplier not found</p>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col min-h-screen bg-gray-50">
//       {/* Banner */}
//       <div className="relative w-full h-56 md:h-72">
//         <Image
//           src={supplier.bannerUrl || "/images/banner-1.jpg"}
//           alt="Supplier Banner"
//           fill
//           className="object-cover rounded-b-2xl"
//         />
//         <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center text-white">
//           {
//             <Image
//               src={supplier.logo || "/images/logo.svg"}
//               alt="Supplier Logo"
//               width={80}
//               height={80}
//               className="rounded-full border-4 border-white mb-3 object-cover"
//             />
//           }
//           <h1 className="text-2xl md:text-3xl font-bold">
//             {supplier.companyName || supplier.name}
//           </h1>
//           {supplier.tagLine && (
//             <p className="text-sm md:text-base max-w-xl">{supplier.tagLine}</p>
//           )}
//         </div>
//       </div>

//       {/* About */}
//       <section className="px-4 md:px-8 py-6 text-center max-w-3xl mx-auto">
//         <h2 className="text-xl font-semibold mb-2">About Us</h2>
//         <p className="text-gray-600">
//           {supplier.about || "This supplier has not added a description yet."}
//         </p>
//         <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
//           {
//             <span>
//               📍 {supplier.location || "Dar es Salaam"},{" "}
//               {supplier.nation || "TZ"}
//             </span>
//           }
//           {supplier.yearsActive && (
//             <span>🕒 {supplier.yearsActive || 1}+ years in business</span>
//           )}
//           {/* {supplier.isVerified && */}
//           <span className="text-green-600 font-medium">
//             ✅ Verified Supplier
//           </span>
//           {/* } */}
//         </div>
//       </section>

//       {/* Why Choose Us */}
//       <section className="px-4 md:px-8 py-6">
//         <h2 className="text-xl font-semibold text-center mb-4">
//           Why Choose Us
//         </h2>
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//           <Card className="shadow-md">
//             <CardContent className="flex flex-col items-center py-6">
//               <span className="text-3xl">⚡</span>
//               <p className="mt-2 text-sm font-medium">Fast Delivery</p>
//             </CardContent>
//           </Card>
//           <Card className="shadow-md">
//             <CardContent className="flex flex-col items-center py-6">
//               <span className="text-3xl">✅</span>
//               <p className="mt-2 text-sm font-medium">Verified Supplier</p>
//             </CardContent>
//           </Card>
//           <Card className="shadow-md">
//             <CardContent className="flex flex-col items-center py-6">
//               <span className="text-3xl">⭐</span>
//               <p className="mt-2 text-sm font-medium">
//                 Rated {supplier.rating?.toString() || "0.0"}
//               </p>
//             </CardContent>
//           </Card>
//           <Card className="shadow-md">
//             <CardContent className="flex flex-col items-center py-6">
//               <span className="text-3xl">📞</span>
//               <p className="mt-2 text-sm font-medium">Responsive Support</p>
//             </CardContent>
//           </Card>
//         </div>
//       </section>

//       {/* Featured Products */}
//       <section className="px-4 md:px-8 py-6">
//         <h2 className="text-xl font-semibold text-center mb-4">
//           Featured Products
//         </h2>
//         {supplier.products.length > 0 ? (
//           <div className="flex gap-4 overflow-x-auto pb-2">
//             {supplier.products.map((p) => (
//               <Card
//                 key={p.id}
//                 className="min-w-[180px] flex-shrink-0 shadow-md hover:shadow-lg transition"
//               >
//                 <CardContent className="p-3">
//                   <Link href={`/product/${p.id}?supplierId=${supplierId}`}>
//                     <Image
//                       src={
//                         p.thumbnail ||
//                         (p.images[0] ?? "/product-placeholder.jpg")
//                       }
//                       alt={p.name}
//                       width={200}
//                       height={150}
//                       className="rounded-md object-cover"
//                     />
//                     <p className="mt-2 text-sm font-medium text-center">
//                       {p.name}
//                     </p>
//                   </Link>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>
//         ) : (
//           <p className="text-center text-gray-500">No featured products yet.</p>
//         )}
//         <div className="flex justify-center mt-4">
//           <Link href={`/company/${supplier.id}/products`}>
//             <Button>Angalia Bidhaa zote</Button>
//           </Link>
//         </div>
//       </section>

//       {/* Footer Quick Links */}
//       <footer className="hidden mt-auto bg-white py-4 border-t">
//         <div className="flex justify-center gap-6">
//           <Link href={`/company/${supplier.id}/products`}>
//             <Button variant="outline">Bidhaa</Button>
//           </Link>
//           <Link href={`/company/${supplier.id}/profile`}>
//             <Button variant="outline">Profaili ya Kampuni</Button>
//           </Link>
//           <Link href={`/company/${supplier.id}/categories`}>
//             <Button variant="outline">Jamii</Button>
//           </Link>
//         </div>
//       </footer>
//     </div>
//   );
// }
