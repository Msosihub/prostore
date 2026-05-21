"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import slugify from "slugify";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Image as ImageIcon, Sparkles, Save } from "lucide-react";
import { createProduct, updateProduct } from "@/lib/actions/product.actions";
import { productFormSchema } from "@/lib/validators"; // Adjust path to match your validator exactly
import { UploadButton } from "@/lib/uploadthing"; // Assuming standard implementation wrapper mapping
import RichTextEditor from "../customComponents/richTextEditor";
import PricingTiersFieldArray from "./separate-comp";

interface Category {
  id: string;
  name_en: string;
  name_sw: string;
}

interface Subcategory {
  id: string;
  name_en: string;
  name_sw: string;
  categoryId: string;
}

interface ProductPricing {
  id?: string;
  minQty: number;
  price: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  price: string | number;
  stock: number;
  videoUrl?: string;
  brandId: string;
  categoryId: string;
  subcategoryId: string;
  pricingTiers?: ProductPricing[];
}

interface ProductFormProps {
  type: "Create" | "Update";
  product?: Product;
  productId?: string;
  supplierId: string;
  brands: { id: string; name: string }[];
  categories: Category[];
  videoUrl?: string;
  subcategories: Subcategory[];
}

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function ProductForm({
  type,
  product,
  productId,
  supplierId,
  brands,
  categories,
  subcategories,
}: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      slug: product?.slug || "",
      videoUrl: product?.videoUrl || "",
      description: product?.description || "",
      images: product?.images || [],
      price: product?.price ? String(product.price) : "",
      stock: product?.stock || 0,
      brandId: product?.brandId || "",
      categoryId: product?.categoryId || "",
      subcategoryId: product?.subcategoryId || "",
      supplierId: supplierId || "",
      pricingTiers:
        product?.pricingTiers?.map((tier) => ({
          minQty: tier.minQty,
          price: Number(tier.price),
        })) || [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  // 🟢 MONITOR NAME CHANGES LIVE IN CLIENT MEMORY:
  const watchName = form.watch("name");

  useEffect(() => {
    // Sync slugs automatically on text typing inputs, strictly restricted to Create views
    if (type === "Create" && watchName) {
      const computedSlug = slugify(watchName, { lower: true, strict: true });
      form.setValue("slug", computedSlug, { shouldValidate: true });
    }
  }, [watchName, type, form]);

  // 🟢 LIVE DEPENDENT FILTERING: Read current selected Category to compute subcategory matching subsets
  const selectedCategoryId = form.watch("categoryId");
  const filteredSubcategories = subcategories.filter(
    (sub) => sub.categoryId === selectedCategoryId
  );

  const handleGenerateSlug = () => {
    const productName = form.getValues("name");
    if (!productName.trim()) {
      toast({
        variant: "destructive",
        description: "Andika jina la bidhaa kwanza ili kutengeneza slug.",
      });
      return;
    }
    const generatedSlug = slugify(productName, { lower: true, strict: true });
    form.setValue("slug", generatedSlug, { shouldValidate: true });
  };

  const onSubmit: SubmitHandler<ProductFormValues> = async (values) => {
    startTransition(async () => {
      try {
        if (type === "Create") {
          const res = await createProduct({
            ...values,
            supplierId: supplierId,
          });

          if (!res.success) {
            toast({ variant: "destructive", description: res.message });
            return;
          }
        } else {
          if (!productId) {
            toast({
              variant: "destructive",
              description: "Kitambulisho cha bidhaa (Product ID) hakipatikani.",
            });
            return;
          }
          const res = await updateProduct({ ...values, id: productId });
          if (!res.success) {
            toast({ variant: "destructive", description: res.message });
            return;
          }
        }

        toast({
          description: "Mabadiliko ya bidhaa yamehifadhiwa kikamilifu!",
        });
        router.push("/supplier/products");
        router.refresh();
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          description: "Imeshindikana kuhifadhi, jaribu tena.",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 max-w-4xl mx-auto pb-12"
      >
        {/* Row 1: Name + Auto Slug Generator Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Jina la Bidhaa *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Mf. Waya za Shaba za Jumla (Copper Wires)"
                    className="h-10 text-xs rounded-xl focus-visible:ring-orange-500 bg-slate-50/30 border-slate-200"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Kiungo Maalum cha Tovuti (Slug) *
                </FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      readOnly
                      placeholder="Bonyeza Tengeneza..."
                      className="h-10 text-xs rounded-xl bg-slate-100 border-slate-200 font-mono text-slate-500 select-none"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    onClick={handleGenerateSlug}
                    className="h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl px-4 flex items-center gap-1 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                    Tengeneza
                  </Button>
                </div>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 2: Category + Subcategory + Brand Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Kundi Kuu (Category) *
                </FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    form.setValue("subcategoryId", ""); // Reset subcategory row on primary switch
                  }}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 text-xs rounded-xl focus:ring-orange-500 bg-slate-50/30 border-slate-200 text-slate-700 font-medium">
                      <SelectValue placeholder="Chagua kundi kuu" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white border rounded-xl shadow-xl z-50 text-xs">
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id}
                        className="cursor-pointer rounded-lg focus:bg-slate-50"
                      >
                        {cat.name_sw || cat.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subcategoryId"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Kundi Dogo (Subcategory) *
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  disabled={!selectedCategoryId}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 text-xs rounded-xl focus:ring-orange-500 bg-slate-50/30 border-slate-200 text-slate-700 font-medium disabled:opacity-50">
                      <SelectValue
                        placeholder={
                          selectedCategoryId
                            ? "Chagua kundi dogo"
                            : "Chagua Kundi Kuu kwanza"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white border rounded-xl shadow-xl z-50 text-xs">
                    {filteredSubcategories.map((sub) => (
                      <SelectItem
                        key={sub.id}
                        value={sub.id}
                        className="cursor-pointer rounded-lg focus:bg-slate-50"
                      >
                        {sub.name_sw || sub.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brandId"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Chapa (Brand) *
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 text-xs rounded-xl focus:ring-orange-500 bg-slate-50/30 border-slate-200 text-slate-700 font-medium">
                      <SelectValue placeholder="Chagua Brandi" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white border rounded-xl shadow-xl z-50 text-xs">
                    {brands.map((brand) => (
                      <SelectItem
                        key={brand.id}
                        value={brand.id}
                        className="cursor-pointer rounded-lg focus:bg-slate-50"
                      >
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        {/* Row 3: Base Price + Total Inventory Stock Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Bei Elekezi ya Rejareja (Base Retail Price) *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Ingiza bei ya kipande kimoja (TZS)"
                    className="h-10 text-xs rounded-xl focus-visible:ring-orange-500 bg-slate-50/30 border-slate-200 font-semibold"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Idadi ya Mzigo Uliopo Ghalani (Total Stock) *
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Ingiza jumla ya idadi ya mzigo unaouza"
                    className="h-10 text-xs rounded-xl focus-visible:ring-orange-500 bg-slate-50/30 border-slate-200 font-semibold"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        {/* 🟢 ADD THIS BLOCK DIRECTLY UNDER YOUR PRICE & STOCK GRID LAYOUTS IN THE FORM: */}
        <FormField
          control={form.control}
          name="videoUrl"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex justify-between items-baseline">
                <FormLabel className="text-xs font-semibold text-slate-700">
                  Kiungo cha Video ya Bidhaa (Product Video Link) - Hiari
                </FormLabel>
                <span className="text-[10px] text-slate-400 font-medium font-mono">
                  YouTube, Instagram au Facebook
                </span>
              </div>
              <FormControl>
                <Input
                  placeholder="Mfano: https://youtube.com..."
                  className="h-10 text-xs rounded-xl focus-visible:ring-orange-500 bg-slate-50/30 border-slate-200"
                  {...field}
                  value={field.value || ""} // Prevents raw input warning exceptions if value is null
                />
              </FormControl>
              <p className="text-[10px] text-slate-400 leading-normal font-light">
                Weka kiungo cha video ili wateja waweze kuitazama bidhaa hii
                ikifanya kazi moja kwa moja kwenye ukurasa wa bidhaa.
              </p>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        {/* Row 4: Wholesale Pricing Tiers Context Area */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-orange-500 fill-orange-100" />{" "}
            Ngazi za Bei za Jumla (Wholesale Pricing Tiers)
          </h3>
          <p className="text-[11px] text-slate-400 pb-2">
            Andika kiwango cha chini cha bidhaa na bei yake ili kuwapa punguzo
            wanaonunua kwa wingi.
          </p>
          <PricingTiersFieldArray control={form.control} />
        </div>

        {/* Row 5: Multi-Image Uploading Integration Matrix Dropzone */}
        {/* 🟢 UPGRADED MULTI-IMAGE INTEGRATION MATRIX DROPZONE */}
        <div className="space-y-1.5 w-full">
          <FormLabel className="text-xs font-semibold text-slate-700">
            Picha za Bidhaa (Zisizozidi 5) *
          </FormLabel>
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/40 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative group">
            <UploadButton
              endpoint="imageUploader"
              // 🟢 CONFIGURATION FIX: Grants browser permissions to multi-select files simultaneously
              //multiple={true}
              config={{ mode: "manual" }}
              appearance={{
                button:
                  "bg-slate-900 text-white text-xs font-bold px-4 h-9 rounded-xl shadow-sm cursor-pointer hover:bg-slate-800 transition-colors",
                allowedContent: "text-[10px] text-slate-400 font-medium mt-1",
              }}
              content={{ button: "Chagua na Pakia Picha" }}
              onUploadBegin={() => {
                setUploading(true);
                toast({
                  title: "Tafadhali subiri...",
                  description: "Picha zako zinapakiwa salama kwenye mfumo 🚀",
                });
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClientUploadComplete={(res: any) => {
                setUploading(false);
                const existing = form.getValues("images") || [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newUrls = res.map((r: any) => r.url);

                // 🟢 MULTI-UPLOAD SAFETY CHECK: Intercept batch size limit breaches before validation errors trigger
                if (existing.length + newUrls.length > 5) {
                  toast({
                    variant: "destructive",
                    title: "Mpakio Umekataliwa",
                    description: `Maudhui yamezidi kikomo. Unaweza kuweka hadi picha 5 pekee. (Kwa sasa unazo ${existing.length} na umejaribu kuongeza ${newUrls.length}).`,
                  });
                  return;
                }

                form.setValue("images", [...existing, ...newUrls], {
                  shouldValidate: true,
                });
                toast({
                  title: "Mpakio Umekamilika! 🎉",
                  description: `Picha ${newUrls.length} zimeongezwa kwa mafanikio.`,
                });
              }}
              onUploadError={(error: { message: string }) => {
                setUploading(false);
                toast({
                  variant: "destructive",
                  description:
                    error.message || "Hitilafu imetokea wakati wa kupakia.",
                });
              }}
            />

            {uploading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center gap-2 text-slate-800 text-xs font-bold">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                <span>Mifumo inapokea picha ghalani...</span>
              </div>
            )}

            <div className="mt-3 text-[11px] text-slate-400 font-medium flex items-center gap-1 select-none">
              <ImageIcon className="w-3.5 h-3.5 text-slate-300" />
              <span>
                Buruta na udondoshe au bofye hapa kupakia picha nyingi kwa mara
                moja (Zisizozidi 5)
              </span>
            </div>
          </div>

          {/* Dynamic Image Thumbnails Grid Preview Panel */}
          {form.watch("images")?.length > 0 && (
            <div className="flex gap-2.5 flex-wrap pt-2">
              {form.watch("images").map((src: string, idx: number) => (
                <div
                  key={idx}
                  className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-white group shadow-sm flex items-center justify-center p-1"
                >
                  <Image
                    src={src}
                    alt={`preview-${idx}`}
                    fill
                    className="object-contain p-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = form
                        .getValues("images")
                        .filter((_, i) => i !== idx);
                      form.setValue("images", updated, {
                        shouldValidate: true,
                      });
                    }}
                    className="absolute top-1 right-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 opacity-90 transition-opacity shadow-sm outline-none"
                    aria-label="Ondoa picha hii"
                  >
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 6: Rich Text Product Narrative Description Editor */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-semibold text-slate-700">
                Maelezo Kamili ya Bidhaa (Product Description) *
              </FormLabel>
              <FormControl>
                <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 bg-white min-h-[160px]">
                  <RichTextEditor
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Andika sifa, vipimo, ubora au maelezo ya ziada ya bidhaa yako hapa..."
                    onBlur={field.onBlur}
                    className="p-3 w-full outline-none text-xs leading-relaxed"
                  />
                </div>
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        {/* Form Action Submissions Block */}
        <div className="pt-3 border-t border-slate-100">
          <Button
            type="submit"
            disabled={isPending || form.formState.isSubmitting}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10 transition-colors"
          >
            {isPending || form.formState.isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                <span>Tunahifadhi data ya bidhaa...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-orange-400" />
                <span>
                  {type === "Create"
                    ? "Chapisha Bidhaa Hii"
                    : "Sasisha Bidhaa Hii"}
                </span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
