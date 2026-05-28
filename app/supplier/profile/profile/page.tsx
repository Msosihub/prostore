"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // ✅ your uploader
import { toast } from "@/hooks/use-toast";
import { formSchema } from "@/lib/validators";
import { UploadButton } from "@/lib/uploadthing";
import { APP_NAME, DEFAULT_WORKING_HOURS } from "@/lib/constants";
import Image from "next/image";
import { Check, ImagePlus, Loader2, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const allowedPolicyTypes = [
  "Return Policy",
  "Shipping Policy",
  "Privacy Policy",
  "Terms of Service",
  "Custom",
];

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [updated, setUpdated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [username, setUsername] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      username: "",
      about: "",
      banner: "",
      logo: "",
      tagLine: "",
      businessType: "", // default
      nation: "",
      location: "",
      website: "",
      email: "",
      phone: "",
      businessHours: DEFAULT_WORKING_HOURS,
      policies: [],
      gallery: [],
    },
  });

  useEffect(() => {
    const delay = setTimeout(() => {
      if (!username) return;
      checkUsername(username);
    }, 500); // wait 500ms after typing

    return () => clearTimeout(delay); // cancel if user types again
  }, [username]);

  const checkUsername = async (raw: string) => {
    const normalized = raw.trim().toLowerCase(); // ✅ normalize
    setCheckingUsername(true);

    try {
      const res = await fetch("/api/suppliers/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalized,
          currentUsername: form.getValues("username"), // or supplierId
        }),
      });

      const data = await res.json();
      setUsernameAvailable(data.available);
    } catch (err) {
      console.error("Username check failed", err);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  // policies field array
  const {
    fields: policyFields,
    append: appendPolicy,
    remove: removePolicy,
  } = useFieldArray({
    control: form.control,
    name: "policies",
  });

  // convenience: watch gallery to render previews
  const gallery = form.watch("gallery") || [];

  // Fetch supplier info
  useEffect(() => {
    const fetchSupplier = async () => {
      setUpdated(false);
      try {
        const res = await fetch("/api/suppliers/me");
        const data = await res.json();
        console.log("Data from database", data);
        const mergedData = {
          ...data,
          businessHours:
            Array.isArray(data.businessHours) && data.businessHours.length > 0
              ? data.businessHours
              : DEFAULT_WORKING_HOURS,
          policies: data.SupplierPolicy || [], // ✅ ensure policies are present
          banner: data.bannerUrl || "",
          gallery: Array.isArray(data.gallery) ? data.gallery : [],
          website:
            data.website ||
            `www.${APP_NAME.toLocaleLowerCase()}.com/${data?.username}`,
          businessType: data.businessType || "",
          email: data.email || "",
          nation: data.nation || "",
          location: data.location || "",
          phone: data.phone || "",
          about: data.about || "",
        };
        console.log("MergedData: ", mergedData);
        form.reset(mergedData);
      } catch (err) {
        console.error("Failed to load supplier profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    // TODO: replace with API call to save supplier profile

    console.log("Profile Data:", data);

    const invalidHours = data.businessHours.filter(
      (h) => h.open && h.close && h.open >= h.close
    );

    if (invalidHours.length > 0) {
      toast({
        variant: "destructive",
        description: "Masaa ya kufungua lazima yawe kabla ya kufunga.",
      });
      return;
    }

    if (!Array.isArray(data.policies) || data.policies.length === 0) {
      toast({
        variant: "destructive",
        description: "Tafadhali ongeza angalau sera moja ya biashara.",
      });
      return;
    }

    setSaving(true);
    setUpdated(false);
    try {
      const res = await fetch("/api/suppliers/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      setUpdated(true);
      if (res.ok) {
        // Optionally show a success message
        toast({
          title: "Imefanikiwa vyema.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Helper to add uploaded images to gallery safely
  function handleGalleryUploadComplete(res: { ufsUrl: string }[]) {
    if (!res || res.length === 0) return;
    const newUrls = res.map((r) => r.ufsUrl);
    const existing = form.getValues("gallery") || [];
    if (existing.length + newUrls.length > 5) {
      toast({
        variant: "destructive",
        description: "Unaweza kupakia hadi picha 5 pekee (max 5).",
      });
      return;
    }
    // newUrls.forEach((u) => appendGallery(u));
    form.setValue("gallery", [...existing, ...newUrls]);
    toast({
      title: "Upload successful",
      description: `${newUrls.length} image(s) uploaded`,
    });
  }

  // small UI for removing gallery item (by index)
  //   function handleRemoveGallery(index: number) {
  //     removeGallery(index);
  //     toast({ title: "Removed", description: "Image removed from gallery." });
  //   }

  function handleRemoveGallery(index: number) {
    const current = form.getValues("gallery") || [];
    const updated = [...current.slice(0, index), ...current.slice(index + 1)];
    form.setValue("gallery", updated);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <h1 className="text-2xl font-bold">Profile/Wasifu Wa Muuzaji</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Banner */}
          <section id="banner" className="scroll-mt-24">
            <Card>
              <CardContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="banner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bango (moja)</FormLabel>
                      <FormControl>
                        <UploadButton
                          endpoint="imageUploader"
                          onUploadBegin={() => setUploading(true)}
                          disabled={uploading}
                          content={{
                            button: uploading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="animate-spin h-4 w-4" />
                                Inapakia...
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1 text-sm">
                                <ImagePlus
                                  className="h-6 w-6 pt-1"
                                  color="#2563eb"
                                />
                                <span className="font-medium text-blue-600">
                                  Bonyeza hapa kupakia Bango lako
                                </span>
                              </div>
                            ),
                            allowedContent: (
                              <span className="text-xs text-muted-foreground">
                                Isizidi: 4MB, (1200x300)
                              </span>
                            ),
                          }}
                          onClientUploadComplete={(res) => {
                            setUploading(false);
                            if (res?.[0]?.ufsUrl) {
                              field.onChange(res[0].ufsUrl);
                              toast({ title: "Banner uploaded" });
                            }
                          }}
                          onUploadError={(err) => {
                            setUploading(false);
                            toast({
                              variant: "destructive",
                              description: err.message,
                            });
                          }}
                        />
                      </FormControl>

                      {field.value ? (
                        <Image
                          src={field.value || "/images/mini-banner-size.webp"}
                          alt="banner"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/mini-banner-size.webp";
                          }}
                          width={1200}
                          height={300}
                          className="rounded-lg w-full object-cover mt-2"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground mt-2">
                          Hakuna banner imewekwa.
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Logo */}
            <Card>
              <CardContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo (Moja)</FormLabel>
                      <FormControl>
                        <UploadButton
                          endpoint="imageUploader"
                          onUploadBegin={() => setUploading(true)}
                          disabled={uploading}
                          content={{
                            button: uploading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="animate-spin h-4 w-4" />
                                Inapakia...
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1 text-sm">
                                <ImagePlus
                                  className="h-6 w-6 pt-1"
                                  color="#2563eb"
                                />
                                <span className="font-medium text-blue-600">
                                  Bonyeza kupakia Logo yako
                                </span>
                              </div>
                            ),
                            allowedContent: (
                              <span className="text-xs text-muted-foreground">
                                Isizidi: 4MB
                              </span>
                            ),
                          }}
                          onClientUploadComplete={(res) => {
                            setUploading(false);
                            if (res?.[0]?.ufsUrl) {
                              field.onChange(res[0].ufsUrl);
                              toast({ title: "Logo uploaded" });
                            }
                          }}
                          onUploadError={(err) => {
                            setUploading(false);
                            toast({
                              variant: "destructive",
                              description: err.message,
                            });
                          }}
                        />
                      </FormControl>

                      {field.value ? (
                        <Image
                          src={field.value || "/images/logo.svg"}
                          alt="logo"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/images/logo.svg";
                          }}
                          width={96}
                          height={96}
                          className="rounded-full object-cover mt-2"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground mt-2">
                          Hakuna logo imewekwa.
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </section>

          {/* Basic info */}
          <section id="business" className="scroll-mt-24">
            <Card>
              <CardContent className="grid gap-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jina la Biashara</FormLabel>
                      <FormControl>
                        <Input placeholder="mf. Moshi Electronics" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aina ya Biashara</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="mf. Mtengenezaji, Jumla, Rejareja"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Jina la Kipekee la Mtumiaji (username)
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-1">
                          <Input
                            placeholder="@moshielectronics"
                            {...field}
                            {...form.register("username")}
                            onChange={(e) =>
                              setUsername(e.target.value.trim().toLowerCase())
                            }
                          />

                          {usernameAvailable === false && (
                            <span className="text-sm text-red-600">
                              Username tayari imetumika.
                            </span>
                          )}
                          {usernameAvailable === true && (
                            <span className="text-sm text-green-600">
                              Username inapatikana.{" "}
                              <Check className="inline" color="#16a34a" />
                            </span>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="about"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kuhusu / Maelezo Fupi</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Waambie wanunuzi kuhusu biashara yako"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nchi</FormLabel>
                      <FormControl>
                        <Input placeholder="mf. Tanzania" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mahali</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="mf. Manzese, Dar es Salaam"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Namba ya Simu</FormLabel>
                      <FormControl>
                        <Input placeholder="mf. +255 712 345 678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barua Pepe(si lazima)</FormLabel>
                      <FormControl>
                        <Input placeholder="mf.jina@gmail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website(si lazima)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="mf. www.biasharayangu.co.tz"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Business hours */}
            <Card>
              <CardContent className="space-y-2 pt-4">
                <h2 className="font-semibold">Masaa ya Biashara</h2>
                {form.watch("businessHours")?.map((hour, idx) => (
                  <div
                    key={hour.day}
                    className="flex flex-col md:flex-row md:items-center gap-2 text-sm capitalize"
                  >
                    <div className="w-28">{hour.day}</div>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type="time"
                          step={60}
                          value={hour.open || ""}
                          onChange={(e) =>
                            form.setValue(
                              `businessHours.${idx}.open`,
                              e.target.value,
                              {
                                shouldValidate: true,
                              }
                            )
                          }
                        />
                      </FormControl>
                      <span>-</span>
                      <FormControl>
                        <Input
                          type="time"
                          step={60}
                          value={hour.close || ""}
                          onChange={(e) =>
                            form.setValue(
                              `businessHours.${idx}.close`,
                              e.target.value,
                              {
                                shouldValidate: true,
                              }
                            )
                          }
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          form.setValue(`businessHours.${idx}.open`, "");
                          form.setValue(`businessHours.${idx}.close`, "");
                          toast({
                            title: "Pamefungwa",
                            description: `${hour.day} imewekwa kuwa pamefungwa`,
                          });
                        }}
                      >
                        Pamefungwa
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {/* Policies (dropdown with Custom) */}

          {/* Dynamic Policies Section */}
          <Card className="shadow-sm border-slate-100 rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-4 bg-slate-50/40 border-b border-slate-100">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Sera za Biashara (Store Policies)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {policyFields.length === 0 && (
                <div className="text-xs text-slate-400 italic bg-slate-50/50 p-4 border border-dashed rounded-xl text-center">
                  Hakuna sera zilizoongezwa bado. Tafadhali ongeza angalau sera
                  moja ya biashara.
                </div>
              )}

              <section id="policies" className="scroll-mt-24 space-y-3.5">
                {policyFields.map((p, i) => (
                  <div
                    key={p.id}
                    className="space-y-4 border border-slate-100 p-4 rounded-xl bg-white relative animate-in fade-in duration-200 shadow-sm"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Policy Type Selection */}
                      <Controller
                        control={form.control}
                        name={`policies.${i}.type` as const}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs font-semibold text-slate-700">
                              Aina ya Sera *
                            </FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                if (val !== "Custom") {
                                  form.setValue(
                                    `policies.${i}.customLabel` as const,
                                    ""
                                  );
                                }
                              }}
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10 text-xs rounded-xl focus:ring-orange-500 bg-slate-50/30 border-slate-200 text-slate-700 font-medium">
                                  <SelectValue placeholder="Chagua aina ya sera" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white text-xs rounded-xl shadow-xl border">
                                {allowedPolicyTypes.map((t) => (
                                  <SelectItem
                                    key={t}
                                    value={t}
                                    className="cursor-pointer focus:bg-slate-50"
                                  >
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      {/* Custom Policy Label Input (Conditional Render) */}
                      {form.watch(`policies.${i}.type`) === "Custom" && (
                        <Controller
                          control={form.control}
                          name={`policies.${i}.customLabel` as const}
                          render={({ field }) => (
                            <FormItem className="space-y-1 animate-in fade-in duration-200">
                              <FormLabel className="text-xs font-semibold text-slate-700">
                                Lebo Maalum (Custom Label) *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Mfano: Sera ya Likizo / Ramadhani"
                                  className="h-10 text-xs rounded-xl focus-visible:ring-orange-500 bg-slate-50/40 border-slate-200"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {/* Policy Narrative Content Textarea */}
                    <Controller
                      control={form.control}
                      name={`policies.${i}.content` as const}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-slate-700">
                            Maudhui ya Sera *
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Eleza kwa ufasaha maelezo, utaratibu na masharti ya sera hii..."
                              rows={4}
                              className="text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30 resize-none leading-relaxed"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePolicy(i)}
                        className="h-8 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50/60 rounded-xl px-3 flex items-center gap-1"
                      >
                        <Trash className="h-3.5 w-3.5" /> Ondoa Sera
                      </Button>
                    </div>
                  </div>
                ))}
              </section>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendPolicy({
                      type: "Return Policy",
                      customLabel: "",
                      content: "",
                    })
                  }
                  className="h-9 text-[11px] font-bold border-dashed border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50/10 rounded-xl px-3 flex items-center gap-1"
                >
                  + Ongeza Sera Mpya
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Store Gallery Images Grid Section */}
          <section id="gallery" className="scroll-mt-24">
            <Card className="shadow-sm border-slate-100 rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-4 bg-slate-50/40 border-b border-slate-100">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Picha za Ofisi / Showroom (Gallery)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-slate-400">
                  Pakia picha za ofisi yako, ghala au viwanda ili kuwapa
                  uaminifu wanunuzi wanaotembelea wasifu wa duka lako.
                </p>

                <div className="grid grid-cols-1 gap-4">
                  <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/40 flex flex-col items-center justify-center cursor-pointer relative min-h-[90px]">
                    <UploadButton
                      endpoint="galleryImageUploader"
                      onUploadBegin={() => setUploading(true)}
                      disabled={uploading}
                      appearance={{
                        button:
                          "bg-slate-900 text-white text-[11px] font-bold h-8 px-4 rounded-xl shadow-sm cursor-pointer hover:bg-slate-800 transition-colors",
                        allowedContent:
                          "text-[9px] text-slate-400 font-medium mt-1",
                      }}
                      content={{ button: "Pakia Picha za Ghala" }}
                      onClientUploadComplete={(res) => {
                        setUploading(false);
                        handleGalleryUploadComplete(res);
                      }}
                      onUploadError={(err) => {
                        setUploading(false);
                        toast({
                          variant: "destructive",
                          description:
                            err.message ||
                            "Hitilafu imetokea wakati wa kupakia.",
                        });
                      }}
                    />

                    {uploading && (
                      <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-slate-800">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                        <span>Mifumo inapokea picha...</span>
                      </div>
                    )}
                  </div>

                  {/* Image Grid Preview Panels Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                    {gallery.map((url: string, idx: number) => (
                      <div
                        key={idx}
                        className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-100 bg-white shadow-sm group"
                      >
                        <Image
                          src={url}
                          alt={`gallery-${idx}`}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition-transform group-hover:scale-105 duration-300"
                        />
                        <button
                          type="button"
                          aria-label="Remove image from showroom gallery grid link"
                          onClick={() => handleRemoveGallery(idx)}
                          className="absolute top-1.5 right-1.5 bg-white/90 text-rose-600 rounded-lg p-1.5 shadow-sm opacity-90 hover:bg-white hover:text-rose-700 transition-colors outline-none"
                        >
                          <Trash className="h-3.5 w-3.5 stroke-[2.2]" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {gallery.length === 0 && (
                    <div className="text-[11px] text-slate-400 italic text-center py-4 bg-slate-50/30 rounded-xl border border-dashed">
                      Hakuna picha za duka au ghala zilizowekwa bado (Upeo ni
                      picha 6).
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 🟢 FIXED SEALED STICKY BOTTOM SAVE BUTTON CONTROLS */}
          <div className="sticky bottom-4 pt-4 mt-6 border-t border-slate-100 bg-white/80 backdrop-blur-md pb-2 z-30">
            <Button
              type="submit"
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10 transition-colors"
              disabled={
                uploading ||
                saving ||
                usernameAvailable === false ||
                checkingUsername
              }
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  Tunahifadhi mabadiliko...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-orange-400 stroke-[2.5]" />
                  Hifadhi Wasifu wa Duka (Save Profile)
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
