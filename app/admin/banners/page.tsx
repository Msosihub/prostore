"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
// import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  //   DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { UploadButton } from "@/lib/uploadthing";
import { ImagePlus, Loader, Loader2 } from "lucide-react";
import type { ClientUploadedFileData } from "uploadthing/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useSWR from "swr";
import { Banner, Category } from "@/types";

export const dynamic = "force-dynamic";

type ExtendedUploadData = ClientUploadedFileData<{
  uploadedBy?: string;
}> & {
  ufsUrl?: string;
  fileUrl?: string;
};

type BannerItem = {
  id: string;
  image: string;
  title?: string | null;
  link?: string;
  productId?: string;
  bannerId?: string;
};

const fetcher = async (url: string): Promise<Category[]> => {
  const res = await fetch(url);
  if (!res) throw new Error("Failed to fetch");
  return res.json();
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);

  // banner form modal
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [bannerForm, setBannerForm] = useState<Partial<Banner>>({
    image: "",
    title: "",
    subtitle: "",
    text: "",
    link: "",
    type: "",
    // data: {},
    isActive: false,
    mode: "MANUAL",
  });

  // banner item modal
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<BannerItem | null>(null);
  const [itemForm, setItemForm] = useState<Partial<BannerItem>>({
    image: "",
    title: "",
    link: "",
    productId: "",
    bannerId: "",
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const {
    data: categories,
    error,
    isLoading,
  } = useSWR<Category[]>("/api/shared/categories", fetcher);

  // console.log("CATEGORIES:=> ", categories);

  async function fetchBanners() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      const data = await res.json();
      // console.log("Banners: ", data)
      setBanners(data);
    } catch (err) {
      toast({ variant: "destructive", description: "Failed to load banners" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Banner CRUD ----------

  function openNewBanner() {
    setEditingBanner(null);
    setBannerForm({
      image: "",
      title: "",
      subtitle: "",
      text: "",
      link: "",
      type: "",
      // data: {},
      isActive: false,
      mode: "MANUAL",
    });
    setShowBannerDialog(true);
  }

  function openEditBanner(b: Banner) {
    setEditingBanner(b);
    // console.log("Banner see: ", b);
    setBannerForm({
      image: b.image,
      title: b.title ?? "",
      subtitle: b.subtitle ?? "",
      text: b.text ?? "",
      category: b.category ?? "",
      link: b.link ?? "",
      type: b.type ?? "",
      // data: b.data ?? {},
      isActive: b.isActive,
      mode: b.mode,
    });
    setShowBannerDialog(true);
  }

  async function saveBanner() {
    // console.log("Banner Form: ", bannerForm);
    if (!bannerForm.image) {
      toast({ variant: "destructive", description: "Image is required" });
      return;
    }
    setLoading(true);
    try {
      if (editingBanner) {
        const res = await fetch(`/api/admin/banners/${editingBanner.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bannerForm),
        });
        if (!res.ok) throw new Error("Update failed");
        toast({ description: "Banner updated" });
      } else {
        const res = await fetch(`/api/admin/banners`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bannerForm),
        });
        if (!res.ok) throw new Error("Create failed");
        toast({ description: "Banner created" });
      }
      setShowBannerDialog(false);
      await fetchBanners();
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to save banner",
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteBanner(id: string) {
    if (
      !confirm("Delete this banner? This will remove associated banner items.")
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ description: "Banner deleted" });
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to delete",
      });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error("Update failed");
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isActive: !current } : b))
      );
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to toggle",
      });
    } finally {
      setLoading(false);
    }
  }

  // ---------- BannerItem CRUD ----------

  function openNewItem(bannerId: string) {
    setEditingItem(null);
    setItemForm({ image: "", title: "", link: "", bannerId });
    setShowItemDialog(true);
  }

  function openEditItem(item: BannerItem) {
    setEditingItem(item);
    setItemForm({
      image: item.image,
      title: item.title ?? "",
      link: item.link,
      productId: item.productId,
      bannerId: item.bannerId,
    });
    setShowItemDialog(true);
  }

  async function saveItem() {
    if (!itemForm.image || !itemForm.link || !itemForm.bannerId) {
      toast({
        variant: "destructive",
        description: "image, link and banner are required",
      });
      return;
    }
    setLoading(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/admin/banner-items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemForm),
        });
        if (!res.ok) throw new Error("Update item failed");
        toast({ description: "Item updated" });
      } else {
        const res = await fetch(`/api/admin/banner-items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemForm),
        });
        if (!res.ok) throw new Error("Create item failed");
        toast({ description: "Item created" });
      }
      setShowItemDialog(false);
      await fetchBanners();
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to save item",
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/banner-items/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ description: "Item deleted" });
      await fetchBanners();
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to delete item",
      });
    } finally {
      setLoading(false);
    }
  }

  // helper: UploadThing result URL extractor (robust)
  function extractUploadUrl(uploadResult: ExtendedUploadData[]): string {
    if (!uploadResult || uploadResult.length === 0) return "";
    const first = uploadResult[0];
    return first.url || first.ufsUrl || first.fileUrl || "";
  }

  return (
    <div className="container max-w-6xl py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin — Banners</h1>
        <div className="flex gap-2">
          <Button onClick={openNewBanner}>+ New Banner</Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}

        {banners.map((b) => (
          <Card key={b.id}>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 bg-muted rounded overflow-hidden flex items-center justify-center">
                  {b.image ? (
                    <Image
                      src={b.image || ""}
                      alt={b.title || "banner"}
                      className="object-cover w-full h-full"
                      width={100}
                      height={100}
                    />
                  ) : (
                    <div className="text-sm">No image</div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-lg">
                        {b.title || "(No title)"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {b.subtitle}
                      </div>
                      <div className="text-xs mt-1">{b.type || b.mode}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label>Active</Label>
                        <Switch
                          checked={b.isActive}
                          onCheckedChange={() => toggleActive(b.id, b.isActive)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditBanner(b)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteBanner(b.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* BannerItems list */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Items</div>
                      <div>
                        <Button size="sm" onClick={() => openNewItem(b.id)}>
                          + Add Item
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {b.items?.length ? (
                        b.items.map((it) => (
                          <div
                            key={it.id}
                            className="border rounded p-2 flex items-start gap-2"
                          >
                            <div className="w-20 h-12 overflow-hidden rounded">
                              <Image
                                src={it.image}
                                alt={it.title || "item"}
                                className="object-cover w-full h-full"
                                width={100}
                                height={100}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">
                                {it.title || "(No title)"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {it.link}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditItem(it)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteItem(it.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No items
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Banner Dialog */}
      <Dialog open={showBannerDialog} onOpenChange={setShowBannerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? "Edit Banner" : "New Banner"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Image (required)</Label>
              <div className="flex items-center gap-3">
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
                        <ImagePlus className="h-6 w-6 pt-1" color="#2563eb" />
                        <span className="font-medium text-blue-600">
                          Bonyeza kupakia document yako
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
                    const url = extractUploadUrl(res);
                    if (url) setBannerForm((s) => ({ ...s, image: url }));
                    toast({ description: "Upload complete" });
                  }}
                  onUploadError={(err) => {
                    setUploading(false);
                    toast({
                      variant: "destructive",
                      description: err?.message || "Upload error",
                    });
                  }}
                />

                {bannerForm.image && (
                  <Image
                    src={bannerForm.image}
                    alt="preview"
                    className="h-12 w-24 object-cover rounded"
                    width={128}
                    height={112}
                  />
                )}
              </div>
            </div>

            <div>
              <Label>Title*</Label>
              <Input
                value={bannerForm.title || ""}
                onChange={(e) =>
                  setBannerForm((s) => ({ ...s, title: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Subtitle*</Label>
              <Input
                value={bannerForm.subtitle || ""}
                placeholder="See more"
                onChange={(e) =>
                  setBannerForm((s) => ({ ...s, subtitle: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Category*</Label>
              {categories || isLoading || error ? (
                <Select
                  name="category"
                  value={bannerForm.category || ""}
                  onValueChange={(value) =>
                    setBannerForm((s) => ({ ...s, category: value }))
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="All" value="all">
                      Yote
                    </SelectItem>
                    {(categories !== undefined || categories !== null) &&
                      categories?.map((x) => (
                        <SelectItem key={x.id} value={x.name_en}>
                          {x.name_en}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Loader className="w-4 h-4 animate-spin" />
              )}
            </div>

            <div>
              <Label>Text</Label>
              <Textarea
                value={bannerForm.text || ""}
                onChange={(e) =>
                  setBannerForm((s) => ({ ...s, text: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Link</Label>
              <Input
                value={bannerForm.link || ""}
                onChange={(e) =>
                  setBannerForm((s) => ({ ...s, link: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-4">
              <div>
                <Label>Type </Label>
                <select
                  value={bannerForm.type || "promo"}
                  onChange={(e) =>
                    setBannerForm((s) => ({ ...s, type: e.target.value }))
                  }
                  className="border rounded p-1"
                >
                  <option value="promo">Promo</option>
                  <option value="hero">Hero</option>
                  <option value="category_group">Category Group</option>
                </select>
              </div>

              <div>
                <Label>Mode</Label>
                <select
                  value={bannerForm.mode || "MANUAL"}
                  onChange={(e) =>
                    setBannerForm((s) => ({ ...s, mode: e.target.value }))
                  }
                  className="border rounded p-1"
                >
                  <option value="MANUAL">MANUAL</option>
                  <option value="AUTO">AUTO</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Label>Active</Label>
                <Switch
                  checked={Boolean(bannerForm.isActive)}
                  onCheckedChange={(v) =>
                    setBannerForm((s) => ({ ...s, isActive: v }))
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={saveBanner} disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowBannerDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "New Item"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Image (required)</Label>
              <div className="flex items-center gap-3">
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
                        <ImagePlus className="h-6 w-6 pt-1" color="#2563eb" />
                        <span className="font-medium text-blue-600">
                          Bonyeza kupakia document yako
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
                    const url = extractUploadUrl(res);
                    if (url) setItemForm((s) => ({ ...s, image: url }));
                    toast({ description: "Upload complete" });
                  }}
                  onUploadError={(err) => {
                    setUploading(false);
                    toast({
                      variant: "destructive",
                      description: err?.message || "Upload error",
                    });
                  }}
                />

                {itemForm.image && (
                  <Image
                    src={itemForm.image}
                    alt="preview"
                    className="h-12 w-24 object-cover rounded"
                    width={128}
                    height={112}
                  />
                )}
              </div>
            </div>

            <div>
              <Label>Title*</Label>
              <Input
                value={itemForm.title || ""}
                onChange={(e) =>
                  setItemForm((s) => ({ ...s, title: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Link</Label>
              <Input
                value={itemForm.link || "#"}
                onChange={(e) =>
                  setItemForm((s) => ({ ...s, link: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Product ID* (required)</Label>
              <Input
                value={itemForm.productId || ""}
                onChange={(e) =>
                  setItemForm((s) => ({ ...s, productId: e.target.value }))
                }
              />
            </div>

            {/* hidden: bannerId (set when opening new item) */}
            <div>
              <Input type="hidden" value={itemForm.bannerId || ""} />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveItem} disabled={loading}>
                {loading ? "Saving..." : "Save Item"}
              </Button>
              <Button variant="ghost" onClick={() => setShowItemDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
