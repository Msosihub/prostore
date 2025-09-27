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
import { Card, CardContent } from "@/components/ui/card"; // ✅ your uploader
import { toast } from "@/hooks/use-toast";
import { allowedPolicyTypes, formSchema } from "@/lib/validators";
import { UploadButton } from "@/lib/uploadthing";
import { APP_NAME, DEFAULT_WORKING_HOURS } from "@/lib/constants";
import Image from "next/image";
import { Check, ImagePlus, Loader2, Trash } from "lucide-react";
import { useEffect, useState } from "react";

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

          <Card>
            <CardContent className="space-y-4 pt-4">
              <h2 className="font-semibold">Sera</h2>

              {policyFields.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Hakuna sera zilizoongezwa bado.
                </div>
              )}
              <section id="policies" className="scroll-mt-24">
                {policyFields.map((p, i) => (
                  <div key={p.id} className="space-y-2 border p-3 rounded-md">
                    <div className="grid md:grid-cols-3 gap-2">
                      <Controller
                        control={form.control}
                        name={`policies.${i}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aina</FormLabel>
                            <FormControl>
                              <select
                                className="input"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  // clear customLabel if switching away from Custom
                                  if (e.target.value !== "Custom") {
                                    form.setValue(
                                      `policies.${i}.customLabel`,
                                      ""
                                    );
                                  }
                                }}
                              >
                                <option value="">Chagua aina</option>
                                {allowedPolicyTypes.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {/* show custom label input when type === Custom */}
                      {form.watch(`policies.${i}.type`) === "Custom" && (
                        <Controller
                          control={form.control}
                          name={`policies.${i}.customLabel`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lebo Maalum</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g. Holiday Shipping"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Controller
                      control={form.control}
                      name={`policies.${i}.content`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maudhui</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Maelezo ya sera..."
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removePolicy(i)}
                      >
                        <Trash className="mr-2 h-4 w-4" /> Ondoa
                      </Button>
                    </div>
                  </div>
                ))}
              </section>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendPolicy({
                    type: "Return Policy",
                    customLabel: "",
                    content: "",
                  })
                }
              >
                + Ongeza Sera
              </Button>
            </CardContent>
          </Card>

          {/* Gallery Upload */}
          <section id="gallery" className="scroll-mt-24">
            <Card>
              <CardContent className="space-y-4 pt-4">
                <h2 className="font-semibold">Gallery (max 6)</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pakia picha za bidhaa zako ili zionekane kwenye profile yako.
                </p>

                <div className="grid gap-4">
                  <div>
                    <UploadButton
                      endpoint="galleryImageUploader"
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
                              Bonyeza hapa kupakia picha
                            </span>
                          </div>
                        ),
                        allowedContent: (
                          <span className="text-xs text-muted-foreground">
                            Zisizidi: 4MB, Picha 6 pekee.
                          </span>
                        ),
                      }}
                      onClientUploadComplete={(res) => {
                        setUploading(false);
                        handleGalleryUploadComplete(res);
                      }}
                      onUploadError={(err) => {
                        setUploading(false);
                        toast({
                          variant: "destructive",
                          description: err.message,
                        });
                      }}
                    />
                  </div>

                  {/* previews */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {gallery.map((url: string, idx: number) => (
                      <div key={idx} className="relative   w-full h-28">
                        <Image
                          src={url}
                          alt={`gallery-${idx}`}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover rounded"
                        />
                        <button
                          type="button"
                          aria-label="Remove"
                          className="absolute top-1 right-1 bg-white/80 rounded p-1"
                          onClick={() => handleRemoveGallery(idx)}
                        >
                          <Trash className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {gallery.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Hakuna picha za gallery.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Save CTA */}
          <div className="sticky bottom-6">
            <Button
              type="submit"
              className="w-full"
              disabled={
                uploading ||
                saving ||
                usernameAvailable === false ||
                checkingUsername
              }
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  Saving...
                </>
              ) : updated ? (
                <>
                  <Check className=" w-4 h-4 mr-2" color="green" />
                  Mabadiliko yamehifadhiwa
                </>
              ) : (
                "Nakili Mabadiliko"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
