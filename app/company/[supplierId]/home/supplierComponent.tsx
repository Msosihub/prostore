// "use server";

// // import { Button } from "@/components/ui/button";
// import {
//   Share2,
//   MessageSquare,
//   ShoppingBag,
//   MapPin,
//   Star,
//   Calendar,
//   Info,
//   Clock,
//   Truck,
//   Building2,
//   Globe,
//   Image as ImageIcon,
//   Award,
//   ShieldCheck,
//   Leaf,
//   Factory,
//   Copy,
//   CheckCircle,
//   Link as LinkIcon,
// } from "lucide-react";
// import Image from "next/image";
// import { prisma } from "@/db/prisma";

// /**
//  * Supplier type mapped from your Prisma model (partial)
//  * Add/remove fields if your model evolves.
//  */
// export type Supplier = {
//   id: string;
//   userId?: string;
//   label?: string | null;
//   name: string;
//   username?: string | null;
//   tagLine?: string | null;
//   description?: string | null;
//   email: string;
//   phone?: string | null;
//   companyName?: string | null;
//   businessHours?: any | null; // JSON
//   bannerUrl?: string | null;
//   businessType?: string | null;
//   country?: string | null;
//   location?: string | null;
//   nation?: string | null;
//   about?: string | null;
//   logo?: string | null;
//   website?: string | null;
//   isVerified?: boolean;
//   yearsActive?: number;
//   rating?: number | string; // Decimal in Prisma
//   deliveryRate?: number;
//   responseTime?: string | null;
//   avatar?: string | null;
//   banner?: string | null;
//   certifications?: { id?: string; name?: string; description?: string }[]; // simplified
//   gallery?: string[] | null | string; // either a JSON array or a stringified JSON
//   createdAt?: string;
//   updatedAt?: string;
//   verifiedAt?: string | null;
//   verifiedBy?: string | null;
// };

// export default async function SupplierProfile({
//   params,
// }: {
//   params: Promise<{ supplierId: string }>;
// }) {
//   // const [copied, setCopied] = useState(false);

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

//   // normalize gallery field to string[]
//   const gallery = supplier?.gallery;

//   if (!supplier) {
//     return (
//       <div className="flex justify-center items-center h-96">
//         <p className="text-gray-600">Supplier not found</p>
//       </div>
//     );
//   }

//   const formattedWebsite = `https://nimboya.com/${supplier.username}`;

//   const ratingDisplay = supplier.rating ? String(supplier.rating) : "0.0";
//   const yearsDisplay = (supplier.yearsActive ?? 1) + " years";

//   // Business hours: if supplied as object { mon: "8-5", ... } we render nicely
//   const businessHoursRows = supplier.businessHours;

//   return (
//     <div className="bg-gray-50">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Supplier Header */}
//         <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
//           <div className="relative">
//             {/* Banner */}
//             <div className="h-48 md:h-64 bg-gradient-to-r from-blue-500 to-purple-600">
//               <Image
//                 id="supplier-banner"
//                 src={
//                   supplier.bannerUrl ??
//                   supplier.banner ??
//                   "https://via.placeholder.com/1200x400?text=Banner"
//                 }
//                 alt={`${supplier.name} banner`}
//                 className="w-full h-full object-cover"
//               />
//             </div>

//             {/* Info */}
//             <div className="px-6 pb-6 pt-4 md:pt-0">
//               <div className="flex flex-col md:flex-row items-start md:items-end -mt-16 md:-mt-12">
//                 {/* Avatar / Logo */}
//                 <div className="relative">
//                   <Image
//                     id="supplier-logo"
//                     src={
//                       supplier.avatar ??
//                       supplier.logo ??
//                       "https://via.placeholder.com/200?text=Logo"
//                     }
//                     alt={`${supplier.name} logo`}
//                     className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white bg-white object-cover shadow-md"
//                   />
//                   {supplier.isVerified ? (
//                     <div
//                       id="verification-badge"
//                       className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full shadow-md verified-badge"
//                       title="Verified supplier"
//                     >
//                       <CheckCircle className="w-5 h-5" />
//                     </div>
//                   ) : null}
//                 </div>

//                 {/* Details */}
//                 <div className="mt-4 md:mt-0 md:ml-6 flex-1 w-full">
//                   <div className="flex items-center flex-wrap gap-3">
//                     <h1
//                       id="supplier-name"
//                       className="text-2xl md:text-3xl font-bold text-gray-900"
//                     >
//                       {supplier.name}
//                     </h1>

//                     {supplier.label ? (
//                       <span
//                         id="supplier-label"
//                         className="ml-0 md:ml-3 inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full"
//                       >
//                         {supplier.label}
//                       </span>
//                     ) : null}
//                   </div>

//                   <p
//                     id="supplier-tagline"
//                     className="text-lg text-gray-600 mt-1"
//                   >
//                     {supplier.tagLine ?? supplier.about ?? ""}
//                   </p>

//                   <div className="flex flex-wrap items-center mt-3 gap-4 text-sm text-gray-500">
//                     <div className="flex items-center">
//                       <MapPin className="w-4 h-4 mr-1" />
//                       <span id="supplier-location">
//                         {supplier.location || "—"}
//                       </span>
//                     </div>

//                     <div className="flex items-center">
//                       <Star className="w-4 h-4 mr-1 text-yellow-500" />
//                       <span
//                         id="supplier-rating"
//                         className="font-medium text-gray-800"
//                       >
//                         {ratingDisplay}
//                       </span>
//                       <span className="text-gray-400 ml-1">
//                         ( {/* reviews count unknown */} )
//                       </span>
//                     </div>

//                     <div className="flex items-center">
//                       <Calendar className="w-4 h-4 mr-1" />
//                       <span id="supplier-years">{yearsDisplay}</span>
//                     </div>
//                   </div>

//                   <div className="flex mt-4 space-x-3 flex-wrap">
//                     <Button asChild>
//                       <a
//                         href={`mailto:${supplier.email}`}
//                         className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm"
//                       >
//                         <MessageSquare className="w-4 h-4 mr-2" /> Contact
//                       </a>
//                     </Button>

//                     <Button
//                       asChild
//                       variant="outline"
//                       className="inline-flex items-center px-4 py-2"
//                     >
//                       <a
//                         href={`/supplier/${supplier.username ?? supplier.id}/products`}
//                         className="inline-flex items-center"
//                       >
//                         <ShoppingBag className="w-4 h-4 mr-2" /> View Products
//                       </a>
//                     </Button>

//                     {/* Share menu (simple buttons for now) */}
//                     <div className="inline-flex items-center">
//                       <button
//                         onClick={"handleDeviceShare"}
//                         aria-label="Share"
//                         className="inline-flex items-center px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md shadow-sm border border-gray-300"
//                       >
//                         <Share2 className="w-4 h-4 mr-1" />
//                         <span className="sr-only">Share</span>
//                         <span className="hidden md:inline">Share</span>
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Main Grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Left: main content */}
//           <div className="lg:col-span-2 space-y-6">
//             {/* About */}
//             <section className="bg-white rounded-xl shadow-md p-6">
//               <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
//                 <Info className="w-5 h-5 mr-2 text-blue-600" /> About Us
//               </h2>
//               <p id="supplier-description" className="text-gray-600 mb-4">
//                 {supplier.description ??
//                   supplier.about ??
//                   "No description provided."}
//               </p>

//               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
//                 <div className="bg-gray-50 rounded-lg p-4">
//                   <div className="flex items-center">
//                     <Clock className="w-5 h-5 mr-2 text-blue-600" />
//                     <h3 className="text-sm font-medium text-gray-900">
//                       Response Time
//                     </h3>
//                   </div>
//                   <p id="response-time" className="mt-1 text-sm text-gray-600">
//                     {supplier.responseTime ?? "Within 24 hours"}
//                   </p>
//                 </div>

//                 <div className="bg-gray-50 rounded-lg p-4">
//                   <div className="flex items-center">
//                     <Truck className="w-5 h-5 mr-2 text-blue-600" />
//                     <h3 className="text-sm font-medium text-gray-900">
//                       Delivery Rate
//                     </h3>
//                   </div>
//                   <p id="delivery-rate" className="mt-1 text-sm text-gray-600">
//                     {typeof supplier.deliveryRate === "number"
//                       ? `${supplier.deliveryRate}% on time`
//                       : "N/A"}
//                   </p>
//                 </div>

//                 <div className="bg-gray-50 rounded-lg p-4">
//                   <div className="flex items-center">
//                     <Building2 className="w-5 h-5 mr-2 text-blue-600" />
//                     <h3 className="text-sm font-medium text-gray-900">
//                       Business Type
//                     </h3>
//                   </div>
//                   <p id="business-type" className="mt-1 text-sm text-gray-600">
//                     {supplier.businessType ?? "N/A"}
//                   </p>
//                 </div>

//                 <div className="bg-gray-50 rounded-lg p-4">
//                   <div className="flex items-center">
//                     <Globe className="w-5 h-5 mr-2 text-blue-600" />
//                     <h3 className="text-sm font-medium text-gray-900">
//                       Website
//                     </h3>
//                   </div>
//                   {formattedWebsite ? (
//                     <a
//                       id="supplier-website"
//                       href={formattedWebsite}
//                       target="_blank"
//                       rel="noreferrer"
//                       className="mt-1 text-sm text-blue-600 hover:underline flex items-center gap-2"
//                     >
//                       <LinkIcon className="w-4 h-4" />
//                       <span className="truncate max-w-[10rem]">
//                         {supplier.website}
//                       </span>
//                     </a>
//                   ) : (
//                     <span className="mt-1 text-sm text-gray-600">N/A</span>
//                   )}
//                 </div>
//               </div>
//             </section>

//             {/* Gallery */}
//             <section className="bg-white rounded-xl shadow-md p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h2 className="text-xl font-semibold text-gray-900 flex items-center">
//                   <ImageIcon className="w-5 h-5 mr-2 text-blue-600" /> Gallery
//                 </h2>
//                 <a
//                   href={`/supplier/${supplier.username ?? supplier.id}/gallery`}
//                   className="text-sm font-medium text-blue-600 hover:text-blue-800"
//                 >
//                   View All
//                 </a>
//               </div>

//               <div
//                 id="gallery-grid"
//                 className="grid grid-cols-2 md:grid-cols-3 gap-4"
//               >
//                 {gallery.length === 0 ? (
//                   <div className="text-gray-500">No images uploaded yet.</div>
//                 ) : (
//                   gallery.slice(0, 6).map((src, idx) => (
//                     <div
//                       key={idx}
//                       className="gallery-image aspect-square overflow-hidden rounded-lg bg-gray-100 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-lg"
//                     >
//                       <Image
//                         src={src}
//                         alt={`${supplier.name} gallery ${idx + 1}`}
//                         className="w-full h-full object-cover"
//                       />
//                     </div>
//                   ))
//                 )}
//               </div>
//             </section>
//           </div>

//           {/* Right column */}
//           <aside className="lg:col-span-1 space-y-6">
//             {/* Certifications */}
//             <section className="bg-white rounded-xl shadow-md p-6">
//               <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
//                 <Award className="w-5 h-5 mr-2 text-blue-600" /> Certifications
//               </h2>

//               <div id="certifications" className="space-y-3">
//                 {certifications.length === 0 ? (
//                   <div className="text-gray-500">No certifications listed.</div>
//                 ) : (
//                   certifications.map((c, i) => (
//                     <div
//                       key={c.id ?? i}
//                       className="flex items-center p-3 bg-gray-50 rounded-lg"
//                     >
//                       <div className="flex-shrink-0 bg-blue-100 p-2 rounded-lg">
//                         {/* choose icon based on possible type — simple mapping */}
//                         <ShieldCheck className="w-5 h-5 text-blue-600" />
//                       </div>
//                       <div className="ml-3">
//                         <h3 className="text-sm font-medium text-gray-900">
//                           {c.name ?? "Certification"}
//                         </h3>
//                         {c.description ? (
//                           <p className="text-xs text-gray-500">
//                             {c.description}
//                           </p>
//                         ) : null}
//                       </div>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </section>

//             {/* Business Hours */}
//             <section className="bg-white rounded-xl shadow-md p-6">
//               <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
//                 <Clock className="w-5 h-5 mr-2 text-blue-600" /> Business Hours
//               </h2>

//               <div
//                 id="business-hours"
//                 className="space-y-2 text-sm text-gray-700"
//               >
//                 {businessHoursRows ? (
//                   // businessHoursRows is an object { mon: "8-5", tue: ... }
//                   Object.entries(businessHoursRows).map(([k, v]) => (
//                     <div key={k} className="flex justify-between">
//                       <span className="capitalize text-gray-600">
//                         {k.replace(/_/g, " ")}
//                       </span>
//                       <span className="font-medium text-gray-900">
//                         {v ?? "Closed"}
//                       </span>
//                     </div>
//                   ))
//                 ) : (
//                   <>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Monday - Friday</span>
//                       <span className="font-medium text-gray-900">
//                         8:00 AM - 5:00 PM
//                       </span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Saturday</span>
//                       <span className="font-medium text-gray-900">
//                         9:00 AM - 3:00 PM
//                       </span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Sunday</span>
//                       <span className="font-medium text-gray-900">Closed</span>
//                     </div>
//                   </>
//                 )}
//               </div>
//             </section>

//             {/* Quick actions: copy link, whatsapp */}
//             <section className="bg-white rounded-xl shadow-md p-6">
//               <div className="flex items-center justify-between mb-3">
//                 <h3 className="text-sm font-medium text-gray-900">
//                   Share Supplier
//                 </h3>
//                 <span className="text-xs text-gray-500">
//                   Share or copy link
//                 </span>
//               </div>
//               <div className="flex gap-2">
//                 <button
//                   onClick={handleWhatsAppShare}
//                   className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-green-50 hover:bg-green-100 text-green-700"
//                 >
//                   <MessageSquare className="w-4 h-4" />
//                   <span className="text-sm">WhatsApp</span>
//                 </button>

//                 <button
//                   onClick={handleCopyLink}
//                   className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
//                 >
//                   <Copy className="w-4 h-4" />
//                   <span className="text-sm">
//                     {copied ? "Copied!" : "Copy Link"}
//                   </span>
//                 </button>
//               </div>
//             </section>
//           </aside>
//         </div>
//       </div>

//       {/* small styles for the badge and animation still used */}
//       <style jsx>{`
//         .gallery-image img {
//           transition: transform 0.3s ease;
//         }
//         .verified-badge {
//           animation: pulse 2s infinite;
//         }
//         @keyframes pulse {
//           0% {
//             opacity: 1;
//           }
//           50% {
//             opacity: 0.7;
//           }
//           100% {
//             opacity: 1;
//           }
//         }
//       `}</style>
//     </div>
//   );
// }
