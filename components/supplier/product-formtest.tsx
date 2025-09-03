"use client";

import { useToast } from "@/hooks/use-toast";
import { productDefaultValues } from "@/lib/constants";
import { insertProductSchema, updateProductSchema } from "@/lib/validators";
import { Category, Product } from "@/types";
import Image from "next/image";
import { UploadButton } from "@/lib/uploadthing";
import { useRouter } from "next/navigation";
import {
  ControllerRenderProps,
  SubmitHandler,
  useFieldArray,
  useForm,
} from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import slugify from "slugify";
import { Textarea } from "../ui/textarea";
import { createProduct, updateProduct } from "@/lib/actions/product.actions";
import { Card, CardContent } from "../ui/card";

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
  brands?: { id: string; name: string }[];
  categories?: Category[];
  subcategories?: { id: string; name: string }[];
}) => {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof insertProductSchema>>({
    resolver:
      type === "Update"
        ? zodResolver(updateProductSchema)
        : zodResolver(insertProductSchema),
    defaultValues:
      product && type === "Update" ? product : productDefaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pricingTiers",
  });

  const addTier = () => {
    if (fields.length < 3) append({ minQty: 1, price: 0 });
  };
  const removeTier = (index: number) => remove(index);

  const onSubmit: SubmitHandler<z.infer<typeof insertProductSchema>> = async (
    values
  ) => {
    try {
      if (type === "Create") {
        const res = await createProduct(values);
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
            description: "Product ID is missing for update.",
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
      toast({ description: "Product saved successfully!" });
      router.push("/supplier/products");
    } catch (error) {
      toast({ variant: "destructive", description: "error inn creating" });
      console.log("Errorvvvv", error);
    } finally {
      router.push("/supplier/products");
    }
  };

  const images = form.watch("images");
  const isFeatured = form.watch("isFeatured");
  const banner = form.watch("banner");

  return (
    <Form {...form}>
      <form
        method="POST"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
      >
        <div className="flex flex-col md:flex-row gap-5">
          {/* Name */}
          <FormField
            name="name"
            control={form.control}
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "name"
              >;
            }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Product Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Slug */}
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
              <FormItem className="w-full">
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input disabled placeholder="Enter slug" {...field} />
                    <Button
                      type="button"
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 mt-2"
                      onClick={() => {
                        form.setValue(
                          "slug",
                          slugify(form.getValues("name"), { lower: true })
                        );
                      }}
                    >
                      Generate
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-5">
          {/* Category */}
          <FormField
            name="category"
            control={form.control}
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "category"
              >;
            }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Category" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Brand */}
          <FormField
            name="brand"
            control={form.control}
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "brand"
              >;
            }) => (
              <FormItem>
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Brand" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-5">
          {/* Price */}
          <FormField
            name="price"
            control={form.control}
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "price"
              >;
            }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Product Price" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Stock */}
          <FormField
            name="stock"
            control={form.control}
            render={({
              field,
            }: {
              field: ControllerRenderProps<
                z.infer<typeof insertProductSchema>,
                "stock"
              >;
            }) => (
              <FormItem>
                <FormLabel>Stock</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Stock" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Price Tiers */}
        {/* Price Tiers (max 3) */}
        <div>
          <FormLabel>Price Tiers</FormLabel>

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
              Example shown to buyers:{" "}
              <span className="font-mono">1+ → 20tsh</span>,{" "}
              <span className="font-mono">5+ → 15tsh</span>,{" "}
              <span className="font-mono">10+ → 10tsh</span>.
            </p>
          </div>
        </div>

        <div className="upload-field flex flex-col md:flex-row gap-5">
          {/* Images */}
          <FormField
            name="images"
            control={form.control}
            render={() => (
              <FormItem>
                <FormLabel>Images</FormLabel>
                <Card>
                  <CardContent className="space-y-2 mt-2 min-h-48">
                    <div className="flex-start space-x-2">
                      {images.map((image, index) => (
                        <div key={index} className="relative">
                          <Image
                            src={image}
                            alt={`Image ${index + 1}`}
                            className="object-cover w-20 h-20 object-center rounded-sm"
                            width={100}
                            height={100}
                          />
                        </div>
                      ))}
                      <FormControl>
                        <UploadButton
                          endpoint="imageUploader"
                          onClientUploadComplete={(res: { url: string }[]) => {
                            //const urls = res.map((r) => r.url);
                            form.setValue("images", [...images, res[0].url]);
                          }}
                          onUploadError={(error) => {
                            toast({
                              variant: "destructive",
                              description: error.message,
                            });
                          }}
                        />
                      </FormControl>
                    </div>
                  </CardContent>
                </Card>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="upload-field">{/* IsFeatured */}</div>
        <div className="">
          {/* Description */}
          <FormField
            name="description"
            control={form.control}
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
                  <Textarea
                    placeholder="Enter Description"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="">
          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting}
            className="button col-span-2 w-full md:w-auto"
          >
            {form.formState.isSubmitting ? "Submitting..." : `${type} Product`}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProductForm;
