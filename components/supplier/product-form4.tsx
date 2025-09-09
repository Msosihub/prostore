"use client";

import { useToast } from "@/hooks/use-toast";
import { productDefaultValues } from "@/lib/constants";
import {
  insertProductSchema,
  productFormSchema,
  ProductFormValues,
  updateProductSchema,
} from "@/lib/validators";
import { Product, Category } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2, Loader2 } from "lucide-react";
import Image from "next/image";

import { useRouter } from "next/navigation";
import {
  useForm,
  useFieldArray,
  SubmitHandler,
  ControllerRenderProps,
} from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import slugify from "slugify";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { createProduct, updateProduct } from "@/lib/actions/product.actions";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "../ui/select";
import { UploadButton } from "@/lib/uploadthing";
import { useState } from "react";
import RichTextEditor from "../customComponents/richTextEditor";

const ProductForm = ({
  type,
  product,
  productId,
  supplierId,
  brands,
  categories,
  subcategories,
}: {
  type: "Create" | "Update";
  product?: Product;
  productId?: string;
  supplierId?: string;
  brands: { id: string; name: string }[];
  categories: Category[];
  subcategories: { id: string; name_en: string }[];
}) => {
  const router = useRouter();
  const { toast } = useToast();
  // const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [uploading] = useState(false);
  // console.log("Here are the BEFORE values:", product);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      ...productDefaultValues,
      supplierId: supplierId || "",
      id: product?.id || undefined, // only for update
    },
  });

  //console.log("Here are the form values:", form.getValues());

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pricingTiers",
  });

  // const addTier = () => {
  //   if (fields.length < 3) append({ minQty: 1, price: 0 });
  // };
  // const removeTier = (index: number) => remove(index);

  // //KEEP WATCH
  // const handleFiles = (files: FileList | null) => {
  //   if (!files) return;
  //   const urls = Array.from(files).map((file) => URL.createObjectURL(file));
  //   setPreviewImages((prev) => [...prev, ...urls]);

  //   // ✅ keep form in sync
  //   form.setValue("images", [...(form.getValues("images") || []), ...urls], {
  //     shouldValidate: true,
  //   });
  // };

  const onSubmit: SubmitHandler<ProductFormValues> = async (values) => {
    // console.log("SUPPLIER ID: ", supplierId);
    // const x = { ...values, supplierId };
    // console.log("Here Values: ", x);
    try {
      if (type === "Create") {
        const res = await createProduct({
          ...values,
          supplierId: supplierId || "",
        });
        console.log("Here Values: ", values);

        if (!res.success) {
          toast({
            variant: "destructive",
            description: res.message,
          });
          throw new Error(res.message);
        }
      } else {
        if (!productId) {
          toast({
            variant: "destructive",
            description: "Product ID haipo.",
          });
          return;
        }
        const res = await updateProduct({ ...values, id: productId });
        if (!res.success) {
          toast({
            variant: "destructive",
            description: res.message,
          });
          throw new Error(res.message);
        }
      }
      toast({ description: "Product imehifadhiwa!" });
      router.push("/supplier/products");
    } catch (error) {
      toast({ variant: "destructive", description: "Tatizo limetokea" });
      console.log("Errorvvvv", error);
    } finally {
      router.push("/supplier/products");
    }
  };

  // const images = form.watch("images");
  // const isFeatured = form.watch("isFeatured");
  // const banner = form.watch("banner");

  return (
    <Form {...form}>
      <form
        method="POST"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8  mb-8"
      >
        {/* Name + Slug */}
        <div className="grid md:grid-cols-2 gap-5">
          {/*Name */}
          <FormField
            control={form.control}
            name="name"
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "name"
              >;
            }) => (
              <FormItem>
                <FormLabel>Jina la bidhaa</FormLabel>
                <FormControl>
                  <Input placeholder="Ingiza jina la bidhaa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* SLUG WITH GENERATE BUTTON */}
          <FormField
            control={form.control}
            name="slug"
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "slug"
              >;
            }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      disabled
                      placeholder="Bonyeza Kitufe cheusi"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    onClick={() => {
                      form.setValue(
                        "slug",
                        slugify(form.getValues("name") || "", { lower: true })
                      );
                    }}
                  >
                    Tengeneza
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Category + Subcategory + Brand */}
        <div className="grid md:grid-cols-3 gap-5">
          <FormField
            control={form.control}
            name="categoryId"
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "categoryId"
              >;
            }) => (
              <FormItem>
                <FormLabel>Kundi</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Chagua kundi" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subcategoryId"
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "subcategoryId"
              >;
            }) => (
              <FormItem>
                <FormLabel>Kundi dogo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Chagua kundi dogo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {subcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brandId"
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "brandId"
              >;
            }) => (
              <FormItem>
                <FormLabel>Brandi</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Chagua brandi" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Price + Stock */}
        <div className="grid md:grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="price"
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "price"
              >;
            }) => (
              <FormItem>
                <FormLabel>Bei Elekezi</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ingiza bei ya bidhaa"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stock"
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "stock"
              >;
            }) => (
              <FormItem>
                <FormLabel>Idadi ya mzigo</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ingiza idadi ya mzigo"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Price Tiers */}
        <div>
          <FormLabel>Viwango vya bei(Kulingana na Idadi)</FormLabel>

          <div className="space-y-3 mt-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr,1fr,auto] gap-3 items-start"
              >
                {/* Min Qty */}
                <FormField
                  control={form.control}
                  name={`pricingTiers.${index}.minQty`}
                  render={({
                    field,
                  }: {
                    field: ControllerRenderProps<
                      z.infer<typeof insertProductSchema>,
                      "pricingTiers"
                    >;
                  }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Min Qty</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g. 5"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price */}
                <FormField
                  control={form.control}
                  name={`pricingTiers.${index}.price`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="e.g. 19.99"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Remove row */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-7"
                  onClick={() => remove(index)}
                  aria-label="Remove tier"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Add row (max 3) */}
            {fields.length < 3 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ minQty: 1, price: 0 })}
              >
                + Add Tier
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              Mfano mnunuaje atakavyoona:{" "}
              <span className="font-mono">1+ → 200tsh</span>,{" "}
              <span className="font-mono">5+ → 150tsh</span>,{" "}
              <span className="font-mono">10+ → 100tsh</span>.
            </p>
          </div>
        </div>

        {/* Images */}
        <FormField
          control={form.control}
          name="images"
          render={() => {
            return (
              <FormItem>
                <FormLabel>Picha za bidhaa</FormLabel>
                <FormControl>
                  <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted">
                    <UploadButton
                      endpoint="imageUploader"
                      appearance={{
                        button:
                          "bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md",
                        // : "text-green-600 font-medium",
                      }}
                      content={{
                        button: "Chagua na pakia picha", // 👈 changed text
                      }}
                      // ✅ Enable multiple uploads
                      multiple
                      onUploadBegin={() => {
                        // ✅ show loader when upload starts
                        toast({
                          title: "Tafadhali subiri...",
                          description: "Picha zinapakiwa 🚀",
                          duration: 999999, // stays until upload finishes
                        });
                      }}
                      onClientUploadComplete={(res: { url: string }[]) => {
                        //toast.dismiss(); // ✅ remove loader toast

                        const existing = form.getValues("images") || [];
                        const newUrls = res.map((r) => r.url);

                        if (existing.length + newUrls.length > 5) {
                          toast({
                            variant: "destructive",
                            description: "Unaweza kupakia hadi picha 5 pekee.",
                          });
                          return;
                        }

                        form.setValue("images", [...existing, ...newUrls], {
                          shouldValidate: true,
                        });

                        toast({
                          title: "Upload successful",
                          description: `${newUrls.length} image(s) uploaded`,
                        });
                      }}
                      onUploadError={(error) => {
                        //toast.dismiss(); // remove loader if error happens
                        toast({
                          variant: "destructive",
                          description: error.message,
                        });
                      }}
                    />

                    {/* Loader */}
                    {uploading && (
                      <div className="flex items-center gap-2 mt-2 text-green-600 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Inapakia picha...</span>
                      </div>
                    )}

                    <div className="mt-2 text-sm text-muted-foreground">
                      Buruta na udondoshe au ubofye ili kupakia (picha
                      zisizozidi 5)
                    </div>
                  </div>
                </FormControl>

                {/* Preview thumbnails */}
                {form.watch("images")?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-4">
                    {form.watch("images").map((src: string, idx: number) => (
                      <div
                        key={idx}
                        className="relative w-24 h-24 rounded-md overflow-hidden border"
                      >
                        <Image
                          src={src}
                          alt={`preview-${idx}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                          onClick={() => {
                            const updated = form
                              .getValues("images")
                              .filter((_: string, i: number) => i !== idx);

                            form.setValue("images", updated, {
                              shouldValidate: true,
                            });
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Featured */}

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({
            field,
          }: {
            field: ControllerRenderProps<
              z.infer<typeof insertProductSchema>,
              "description"
            >;
          }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Ingiza maelezo ya bidhaa"
                  onBlur={field.onBlur}
                  className="min-h-[150px] w-full focus:outline-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <div>
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
            className="w-full"
          >
            {form.formState.isSubmitting ? "Submitting..." : `${type} Product`}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProductForm;
