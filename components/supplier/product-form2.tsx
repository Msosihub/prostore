// "use client";

// import { useToast } from "@/hooks/use-toast";
// import { productDefaultValues } from "@/lib/constants";
// import { insertProductSchema, updateProductSchema } from "@/lib/validators";
// import { Product, Category } from "@/types";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Upload, Trash2 } from "lucide-react";

// import { useRouter } from "next/navigation";
// import { useForm, useFieldArray } from "react-hook-form";
// import { z } from "zod";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "../ui/form";
// import slugify from "slugify";
// import { Input } from "../ui/input";
// import { Button } from "../ui/button";
// import { Textarea } from "../ui/textarea";
// import { createProduct, updateProduct } from "@/lib/actions/product.actions";
// import { Card, CardContent } from "../ui/card";
// import Image from "next/image";
// import { Checkbox } from "../ui/checkbox";
// import {
//   Select,
//   SelectTrigger,
//   SelectContent,
//   SelectValue,
//   SelectItem,
// } from "../ui/select";
// import { UploadButton } from "@/lib/uploadthing";
// import { useState } from "react";

// // 🔑 union schema so Create & Update both work
// const productFormSchema = z.union([insertProductSchema, updateProductSchema]);

// type ProductFormValues = z.infer<typeof productFormSchema>;

// const ProductForm = ({
//   type,
//   product,
//   productId,
//   supplierId,
//   brands,
//   categories,
//   subcategories,
// }: {
//   type: "Create" | "Update";
//   product?: Product;
//   productId?: string;
//   supplierId?: string;
//   brands: { id: string; name: string }[];
//   categories: Category[];
//   subcategories: { id: string; name_en: string }[];
// }) => {
//   const router = useRouter();
//   const { toast } = useToast();
//   const [previewImages, setPreviewImages] = useState<string[]>([]);

//   const form = useForm<ProductFormValues>({
//     resolver: zodResolver(productFormSchema),
//     defaultValues:
//       type === "Update" && product
//         ? {
//             ...product,
//             pricingTiers: product.pricingTiers ?? [],
//           }
//         : { ...productDefaultValues, pricingTiers: [] },
//   });

//   const {
//     fields: pricingTiers,
//     append,
//     remove,
//   } = useFieldArray({
//     control: form.control,
//     name: "pricingTiers",
//   });

//   const addTier = () => {
//     if (pricingTiers.length < 3) append({ minQty: 1, price: 0 });
//   };
//   const removeTier = (index: number) => remove(index);

//   const handleFiles = (files: FileList | null) => {
//     if (!files) return;
//     const urls = Array.from(files).map((file) => URL.createObjectURL(file));
//     setPreviewImages((prev) => [...prev, ...urls]);

//     // ✅ keep form in sync
//     form.setValue("images", [...(form.getValues("images") || []), ...urls], {
//       shouldValidate: true,
//     });
//   };

//   const onSubmit = async (values: ProductFormValues) => {
//     try {
//       if (type === "Create") {
//         const res = await createProduct({
//           ...values,
//           supplierId: supplierId || "",
//         });

//         if (!res.success) {
//           toast({ variant: "destructive", description: res.message });
//           return;
//         }

//         toast({ description: res.message });
//         router.push("/supplier/products");
//       }

//       if (type === "Update") {
//         if (!productId) {
//           router.push("/supplier/products");
//           return;
//         }

//         const res = await updateProduct({ ...values, id: productId });

//         if (!res.success) {
//           toast({ variant: "destructive", description: res.message });
//           return;
//         }

//         toast({ description: res.message });
//         router.push("/supplier/products");
//       }
//     } catch (err: any) {
//       toast({
//         variant: "destructive",
//         description: err.message || "Something went wrong",
//       });
//     }
//   };

//   const isFeatured = form.watch("isFeatured");
//   const banner = form.watch("banner");

//   return (
//     <Form {...form}>
//       <form
//         method="POST"
//         onSubmit={form.handleSubmit(onSubmit)}
//         className="space-y-8"
//       >
//         {/* Name + Slug */}
//         <div className="grid md:grid-cols-2 gap-5">
//           <FormField
//             control={form.control}
//             name="name"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Name</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Enter product name" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//           <FormField
//             control={form.control}
//             name="slug"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Slug</FormLabel>
//                 <div className="flex gap-2">
//                   <FormControl>
//                     <Input placeholder="Enter slug" {...field} />
//                   </FormControl>
//                   <Button
//                     type="button"
//                     onClick={() => {
//                       form.setValue(
//                         "slug",
//                         slugify(form.getValues("name") || "", { lower: true })
//                       );
//                     }}
//                   >
//                     Generate
//                   </Button>
//                 </div>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//         </div>

//         {/* Category + Subcategory + Brand */}
//         <div className="grid md:grid-cols-3 gap-5">
//           <FormField
//             control={form.control}
//             name="categoryId"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Category</FormLabel>
//                 <Select
//                   onValueChange={field.onChange}
//                   value={field.value || ""}
//                 >
//                   <FormControl>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select category" />
//                     </SelectTrigger>
//                   </FormControl>
//                   <SelectContent>
//                     {categories.map((cat) => (
//                       <SelectItem key={cat.id} value={cat.id}>
//                         {cat.name_en}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//           <FormField
//             control={form.control}
//             name="subcategoryId"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Subcategory</FormLabel>
//                 <Select
//                   onValueChange={field.onChange}
//                   value={field.value || ""}
//                 >
//                   <FormControl>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select subcategory" />
//                     </SelectTrigger>
//                   </FormControl>
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
//           <FormField
//             control={form.control}
//             name="brandId"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Brand</FormLabel>
//                 <Select
//                   onValueChange={field.onChange}
//                   value={field.value || ""}
//                 >
//                   <FormControl>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select brand" />
//                     </SelectTrigger>
//                   </FormControl>
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
//         </div>

//         {/* Price + Stock */}
//         <div className="grid md:grid-cols-2 gap-5">
//           <FormField
//             control={form.control}
//             name="price"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Base Price</FormLabel>
//                 <FormControl>
//                   <Input
//                     type="number"
//                     placeholder="Enter product price"
//                     {...field}
//                   />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//           <FormField
//             control={form.control}
//             name="stock"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Stock</FormLabel>
//                 <FormControl>
//                   <Input type="number" placeholder="Enter stock" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />
//         </div>

//         {/* Price Tiers */}
//         <div>
//           <FormLabel>Price Tiers</FormLabel>
//           <div className="space-y-3">
//             {pricingTiers.map((tier, index) => (
//               <div key={tier.id} className="flex gap-2 items-center">
//                 <Input
//                   type="number"
//                   placeholder="Min Qty"
//                   {...form.register(`pricingTiers.${index}.minQty` as const)}
//                 />
//                 <Input
//                   type="number"
//                   placeholder="Price"
//                   {...form.register(`pricingTiers.${index}.price` as const)}
//                 />
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="icon"
//                   onClick={() => removeTier(index)}
//                 >
//                   <Trash2 className="w-4 h-4" />
//                 </Button>
//               </div>
//             ))}
//             {pricingTiers.length < 3 && (
//               <Button type="button" variant="outline" onClick={addTier}>
//                 + Add Tier
//               </Button>
//             )}
//           </div>
//         </div>

//         {/* Images */}
//         <FormField
//           control={form.control}
//           name="images"
//           render={() => (
//             <FormItem>
//               <FormLabel>Product Images</FormLabel>
//               <FormControl>
//                 <div
//                   onDrop={(e) => {
//                     e.preventDefault();
//                     handleFiles(e.dataTransfer.files);
//                   }}
//                   onDragOver={(e) => e.preventDefault()}
//                   className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted"
//                   onClick={() => document.getElementById("imageInput")?.click()}
//                 >
//                   <Upload className="h-8 w-8 text-muted-foreground mb-2" />
//                   <p className="text-sm text-muted-foreground">
//                     Drag & drop or click to upload
//                   </p>
//                   <Input
//                     id="imageInput"
//                     type="file"
//                     accept="image/*"
//                     multiple
//                     className="hidden"
//                     onChange={(e) => handleFiles(e.target.files)}
//                   />
//                 </div>
//               </FormControl>

//               {/* Preview thumbnails */}
//               {previewImages.length > 0 && (
//                 <div className="flex gap-2 flex-wrap mt-4">
//                   {previewImages.map((src, idx) => (
//                     <div
//                       key={idx}
//                       className="relative w-24 h-24 rounded-md overflow-hidden border"
//                     >
//                       <img
//                         src={src}
//                         alt={`preview-${idx}`}
//                         className="w-full h-full object-cover"
//                       />
//                       <button
//                         type="button"
//                         className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
//                         onClick={() => {
//                           setPreviewImages((prev) =>
//                             prev.filter((_, i) => i !== idx)
//                           );
//                           form.setValue(
//                             "images",
//                             form
//                               .getValues("images")
//                               .filter((_, i) => i !== idx),
//                             { shouldValidate: true }
//                           );
//                         }}
//                       >
//                         ✕
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         {/* Featured */}
//         <div>
//           <FormLabel>Featured Product</FormLabel>
//           <Card>
//             <CardContent className="space-y-2 mt-2">
//               <FormField
//                 control={form.control}
//                 name="isFeatured"
//                 render={({ field }) => (
//                   <FormItem className="flex items-center gap-2">
//                     <FormControl>
//                       <Checkbox
//                         checked={field.value}
//                         onCheckedChange={field.onChange}
//                       />
//                     </FormControl>
//                     <FormLabel>Is Featured?</FormLabel>
//                   </FormItem>
//                 )}
//               />
//               {isFeatured && banner && (
//                 <Image
//                   src={banner}
//                   alt="banner image"
//                   className="w-full object-cover rounded-sm"
//                   width={1920}
//                   height={680}
//                 />
//               )}
//               {isFeatured && !banner && (
//                 <UploadButton
//                   endpoint="imageUploader"
//                   onClientUploadComplete={(res) => {
//                     form.setValue("banner", res[0].url);
//                   }}
//                   onUploadError={(error: Error) => {
//                     toast({
//                       variant: "destructive",
//                       description: `Upload failed: ${error.message}`,
//                     });
//                   }}
//                 />
//               )}
//             </CardContent>
//           </Card>
//         </div>

//         {/* Description */}
//         <FormField
//           control={form.control}
//           name="description"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Description</FormLabel>
//               <FormControl>
//                 <Textarea
//                   placeholder="Enter product description"
//                   className="resize-none"
//                   {...field}
//                 />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         {/* Submit */}
//         <div>
//           <Button
//             type="submit"
//             size="lg"
//             disabled={form.formState.isSubmitting}
//             className="w-full"
//           >
//             {form.formState.isSubmitting ? "Submitting..." : `${type} Product`}
//           </Button>
//         </div>
//       </form>
//     </Form>
//   );
// };

// export default ProductForm;
