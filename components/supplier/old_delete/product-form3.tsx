// "use client";

// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { insertProductSchema } from "@/lib/validations/product";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Card } from "@/components/ui/card";
// import { Upload, X } from "lucide-react";

// const pricingTierSchema = z.object({
//   minQty: z.coerce.number().min(1),
//   price: z.coerce.number().min(0),
// });

// type PricingTier = z.infer<typeof pricingTierSchema>;
// type InsertProductSchema = z.infer<typeof insertProductSchema>;

// export default function ProductForm({
//   type,
//   supplierId,
//   brands,
//   categories,
//   subcategories,
//   product,
// }: {
//   type: "Create" | "Update";
//   supplierId: string;
//   brands: { id: string; name: string }[];
//   categories: { id: string; name: string }[];
//   subcategories: { id: string; name_en: string }[];
//   product?: InsertProductSchema;
// }) {
//   const [previewImages, setPreviewImages] = useState<string[]>(
//     product?.images || []
//   );

//   const form = useForm<InsertProductSchema>({
//     resolver: zodResolver(insertProductSchema),
//     defaultValues: product || {
//       name: "",
//       slug: "",
//       description: "",
//       stock: 0,
//       images: [],
//       isFeatured: false,
//       banner: null,
//       price: 0,
//       color: "",
//       size: "",
//       brandId: "",
//       categoryId: "",
//       subcategoryId: "",
//       supplierId,
//       pricingTiers: [],
//     },
//   });

//   // ✅ handle uploader
//   const handleFiles = (files: FileList | null) => {
//     if (!files) return;
//     const urls = Array.from(files).map((file) => URL.createObjectURL(file));
//     setPreviewImages((prev) => [...prev, ...urls]);
//     form.setValue("images", [...(form.getValues("images") || []), ...urls], {
//       shouldValidate: true,
//     });
//   };

//   // ✅ handle form submission
//   const onSubmit = (values: InsertProductSchema) => {
//     console.log("Submitting:", values);
//     // TODO: call your API here
//   };

//   return (
//     <Card className="p-6 space-y-6">
//       <Form {...form}>
//         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//           {/* Product Name */}
//           <FormField
//             control={form.control}
//             name="name"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Product Name</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Product name" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           {/* Brand */}
//           <FormField
//             control={form.control}
//             name="brandId"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Brand</FormLabel>
//                 <Select onValueChange={field.onChange} value={field.value}>
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select a brand" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {brands.map((brand) => (
//                       <SelectItem key={brand.id} value={brand.id}>
//                         {brand.name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           {/* Category */}
//           <FormField
//             control={form.control}
//             name="categoryId"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Category</FormLabel>
//                 <Select onValueChange={field.onChange} value={field.value}>
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select a category" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {categories.map((cat) => (
//                       <SelectItem key={cat.id} value={cat.id}>
//                         {cat.name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           {/* Subcategory */}
//           <FormField
//             control={form.control}
//             name="subcategoryId"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Subcategory</FormLabel>
//                 <Select onValueChange={field.onChange} value={field.value}>
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select a subcategory" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {subcategories.map((sub) => (
//                       <SelectItem key={sub.id} value={sub.id}>
//                         {sub.name_en}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           {/* Images */}
//           <FormField
//             control={form.control}
//             name="images"
//             render={() => (
//               <FormItem>
//                 <FormLabel>Product Images</FormLabel>
//                 <div
//                   className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50"
//                   onClick={() => document.getElementById("fileInput")?.click()}
//                 >
//                   <Upload className="h-8 w-8 text-muted-foreground mb-2" />
//                   <p className="text-sm text-muted-foreground">
//                     Click or drag images to upload
//                   </p>
//                   <input
//                     id="fileInput"
//                     type="file"
//                     accept="image/*"
//                     multiple
//                     className="hidden"
//                     onChange={(e) => handleFiles(e.target.files)}
//                   />
//                 </div>

//                 {/* Preview */}
//                 <div className="flex flex-wrap gap-3 mt-4">
//                   {previewImages.map((src, idx) => (
//                     <div key={idx} className="relative">
//                       <Image
//                         src={src}
//                         alt="preview"
//                         className="h-20 w-20 object-cover rounded-md border"
//                       />
//                       <button
//                         type="button"
//                         className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
//                         onClick={() => {
//                           setPreviewImages((prev) =>
//                             prev.filter((_, i) => i !== idx)
//                           );
//                           const current = form.getValues("images") || [];
//                           form.setValue(
//                             "images",
//                             current.filter((_, i) => i !== idx),
//                             {
//                               shouldValidate: true,
//                             }
//                           );
//                         }}
//                       >
//                         <X className="h-3 w-3" />
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           {/* Pricing tiers (max 3) */}
//           <FormField
//             control={form.control}
//             name="pricingTiers"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Pricing Tiers</FormLabel>
//                 <div className="space-y-3">
//                   {(field.value || []).map((tier: PricingTier, idx: number) => (
//                     <div key={idx} className="flex gap-2 items-center">
//                       <Input
//                         type="number"
//                         placeholder="Min Qty"
//                         value={tier.minQty}
//                         onChange={(e) => {
//                           const updated = [...(field.value || [])];
//                           updated[idx].minQty = parseInt(e.target.value);
//                           field.onChange(updated);
//                         }}
//                       />
//                       <Input
//                         type="number"
//                         placeholder="Price"
//                         value={tier.price}
//                         onChange={(e) => {
//                           const updated = [...(field.value || [])];
//                           updated[idx].price = parseFloat(e.target.value);
//                           field.onChange(updated);
//                         }}
//                       />
//                       <Button
//                         type="button"
//                         variant="ghost"
//                         onClick={() => {
//                           const updated = (field.value || []).filter(
//                             (_, i) => i !== idx
//                           );
//                           field.onChange(updated);
//                         }}
//                       >
//                         <X className="h-4 w-4" />
//                       </Button>
//                     </div>
//                   ))}
//                   {(!field.value || field.value.length < 3) && (
//                     <Button
//                       type="button"
//                       variant="outline"
//                       onClick={() =>
//                         field.onChange([
//                           ...(field.value || []),
//                           { minQty: 1, price: 0 },
//                         ])
//                       }
//                     >
//                       Add Tier
//                     </Button>
//                   )}
//                 </div>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           {/* Submit */}
//           <Button type="submit" className="w-full">
//             {type === "Create" ? "Create Product" : "Update Product"}
//           </Button>
//         </form>
//       </Form>
//     </Card>
//   );
// }
