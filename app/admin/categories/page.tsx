"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  // CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { UploadButton } from "@/lib/uploadthing";

type CategoryType = {
  id: string;
  name_en: string;
  name_sw: string;
  description: string;
  image?: string | null;
  sortOrder?: number;
  subcategories: {
    id: string;
    name_en: string;
    name_sw: string;
    image?: string | null;
    sortOrder?: number;
  }[];
};

type SubcategoryType = {
  id: string;
  name_en: string;
  name_sw: string;
  description?: string | null | undefined;
  image?: string | null;
  sortOrder?: number | null | undefined;
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);

  // modal state for category
  const [openCat, setOpenCat] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryType | null>(null);
  const [catForm, setCatForm] = useState({
    name_en: "",
    name_sw: "",
    description: "",
    image: "",
    sortOrder: 0,
  });

  // subcategory modal
  const [openSub, setOpenSub] = useState(false);
  const [parentForSub, setParentForSub] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<SubcategoryType | null>(null);
  const [subForm, setSubForm] = useState({
    name_en: "",
    name_sw: "",
    description: "",
    image: "",
    sortOrder: 0,
  });

  // expanded categories UI
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      setCategories(data);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to load categories",
      });
    } finally {
      setLoading(false);
    }
  }

  function openCreateCategory() {
    setEditingCat(null);
    setCatForm({
      name_en: "",
      name_sw: "",
      description: "",
      image: "",
      sortOrder: 0,
    });
    setOpenCat(true);
  }

  function openEditCategory(cat: CategoryType) {
    setEditingCat(cat);
    setCatForm({
      name_en: cat.name_en,
      name_sw: cat.name_sw,
      description: cat.description || "",
      image: cat.image || "",
      sortOrder: cat.sortOrder ?? 0,
    });
    setOpenCat(true);
  }

  async function saveCategory() {
    try {
      const payload = { ...catForm };
      const endpoint = editingCat
        ? `/api/admin/categories/${editingCat.id}`
        : "/api/admin/categories";
      const method = editingCat ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to save category");
      }
      setOpenCat(false);
      await loadCategories();
      toast({
        description: editingCat ? "Category updated" : "Category created",
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to save",
      });
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to delete category");
      }
      toast({ description: "Category deleted" });
      await loadCategories();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to delete",
      });
    }
  }

  // Subcategory handlers
  function openCreateSub(categoryId: string) {
    setParentForSub(categoryId);
    setEditingSub(null);
    setSubForm({
      name_en: "",
      name_sw: "",
      description: "",
      image: "",
      sortOrder: 0,
    });
    setOpenSub(true);
  }

  function openEditSub(
    categoryId: string,
    sub: {
      id: string;
      name_en: string;
      name_sw: string;
      description?: string | null;
      image?: string | null;
      sortOrder?: number | null;
    }
  ) {
    setParentForSub(categoryId);
    setEditingSub(sub);
    setSubForm({
      name_en: sub.name_en,
      name_sw: sub.name_sw,
      description: sub.description || "",
      image: sub.image || "",
      sortOrder: sub.sortOrder ?? 0,
    });
    setOpenSub(true);
  }

  async function saveSubcategory() {
    try {
      if (!parentForSub) throw new Error("parent missing");
      const endpoint = editingSub
        ? `/api/admin/categories/${parentForSub}/subcategories/${editingSub.id}`
        : `/api/admin/categories/${parentForSub}/subcategories`;
      const method = editingSub ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to save subcategory");
      }
      setOpenSub(false);
      await loadCategories();
      toast({
        description: editingSub ? "Subcategory updated" : "Subcategory created",
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to save subcategory",
      });
    }
  }

  async function deleteSubcategory(subId: string) {
    if (!confirm("Delete this subcategory?")) return;
    try {
      const res = await fetch(
        `/api/admin/categories/placeholder/subcategories/${subId}`,
        { method: "DELETE" }
      );
      console.log("delete subcategory response", { res });
      // Note: endpoint uses placeholder category path param, Prisma will find by subId only.
      // but our route expects params: { id, subId } — for convenience we send to any valid category id path.
      // Simplify: use /api/admin/categories/<categoryId>/subcategories/<subId>.
      // We'll search for the categoryId by scanning categories list:
      const cat = categories.find((c) =>
        c.subcategories.some((s) => s.id === subId)
      );
      if (!cat) throw new Error("Parent category not found");
      const res2 = await fetch(
        `/api/admin/categories/${cat.id}/subcategories/${subId}`,
        { method: "DELETE" }
      );
      if (!res2.ok) {
        const err = await res2.json().catch(() => null);
        throw new Error(err?.error || "Failed to delete subcategory");
      }
      toast({ description: "Subcategory deleted" });
      await loadCategories();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to delete subcategory",
      });
    }
  }

  // update category sortOrder quickly
  async function changeCategoryOrder(id: string, delta: number) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const newOrder = (cat.sortOrder ?? 0) + delta;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: newOrder }),
      });
      if (!res.ok) throw new Error("Failed to update order");
      await loadCategories();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to reorder",
      });
    }
  }

  // update subcategory sortOrder quickly
  async function changeSubOrder(subId: string, delta: number) {
    const cat = categories.find((c) =>
      c.subcategories.some((s) => s.id === subId)
    );
    if (!cat) return;
    const sub = cat.subcategories.find((s) => s.id === subId)!;
    const newOrder = (sub.sortOrder ?? 0) + delta;
    try {
      const res = await fetch(
        `/api/admin/categories/${cat.id}/subcategories/${subId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: newOrder }),
        }
      );
      if (!res.ok) throw new Error("Failed to update sub order");
      await loadCategories();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to reorder subcategory",
      });
    }
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin — Categories</h1>
        <div className="flex gap-2">
          <Button onClick={openCreateCategory}>
            <Plus className="w-4 h-4 mr-1" /> New Category
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div>Loading...</div>
        ) : categories.length === 0 ? (
          <div className="text-muted-foreground">No categories yet.</div>
        ) : (
          categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="w-20 h-20 bg-muted rounded overflow-hidden flex items-center justify-center">
                    {cat.image ? (
                      // Next/Image would require width/height; using img to keep simple
                      <Image
                        src={cat.image}
                        alt={cat.name_en}
                        className="object-cover w-full h-full"
                        width={20}
                        height={20}
                      />
                    ) : (
                      <div className="text-sm">No image</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-lg">
                          {cat.name_en}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {cat.name_sw}
                        </div>
                        {cat.description && (
                          <div className="text-sm mt-1 text-muted-foreground">
                            {cat.description}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => changeCategoryOrder(cat.id, -1)}
                          >
                            <ArrowUp />
                          </Button>
                          <div className="text-sm">{cat.sortOrder ?? 0}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => changeCategoryOrder(cat.id, 1)}
                          >
                            <ArrowDown />
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setExpanded((s) => ({
                                ...s,
                                [cat.id]: !s[cat.id],
                              }));
                            }}
                          >
                            {expanded[cat.id] ? "Collapse" : "Subcategories"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditCategory(cat)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteCategory(cat.id)}
                          >
                            <Trash />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable subcategory area */}
                    {expanded[cat.id] && (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">Subcategories</div>
                          <div>
                            <Button
                              size="sm"
                              onClick={() => openCreateSub(cat.id)}
                            >
                              <Plus className="w-4 h-4 mr-1" /> Add Subcategory
                            </Button>
                            {/* upload category image */}
                            <UploadButton
                              endpoint="imageUploader"
                              content={{ button: "Upload Category Image" }}
                              onClientUploadComplete={async (
                                res: { ufsUrl: string }[]
                              ) => {
                                if (!res?.[0]?.ufsUrl) return;
                                const url = res[0].ufsUrl;
                                try {
                                  const r = await fetch(
                                    `/api/admin/categories/${cat.id}`,
                                    {
                                      method: "PUT",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({ image: url }),
                                    }
                                  );
                                  if (!r.ok) throw new Error("Upload failed");
                                  toast({
                                    description: "Category image updated",
                                  });
                                  await loadCategories();
                                } catch (err: unknown) {
                                  toast({
                                    variant: "destructive",
                                    description:
                                      (err as Error)?.message ||
                                      "Failed to update image",
                                  });
                                }
                              }}
                              onUploadError={(err: unknown) => {
                                toast({
                                  variant: "destructive",
                                  description:
                                    (err as Error)?.message ||
                                    "Failed to upload",
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {cat.subcategories.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              No subcategories yet.
                            </div>
                          ) : (
                            cat.subcategories.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between gap-3 border rounded p-2"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-16 h-12 bg-muted rounded overflow-hidden">
                                    {s.image ? (
                                      <Image
                                        src={s.image}
                                        alt={s.name_en}
                                        className="object-cover w-full h-full"
                                        width={16}
                                        height={12}
                                      />
                                    ) : (
                                      <div className="text-xs p-2">
                                        No image
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium">
                                      {s.name_en}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {s.name_sw}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => changeSubOrder(s.id, -1)}
                                    >
                                      <ArrowUp />
                                    </Button>
                                    <div className="text-sm">
                                      {s.sortOrder ?? 0}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => changeSubOrder(s.id, 1)}
                                    >
                                      <ArrowDown />
                                    </Button>
                                  </div>

                                  <div className="flex gap-1">
                                    <UploadButton
                                      endpoint="imageUploader"
                                      content={{ button: "Upload" }}
                                      onClientUploadComplete={async (
                                        res: { ufsUrl: string }[]
                                      ) => {
                                        if (!res?.[0]?.ufsUrl) return;
                                        const url = res[0].ufsUrl;
                                        try {
                                          const r = await fetch(
                                            `/api/admin/categories/${cat.id}/subcategories/${s.id}`,
                                            {
                                              method: "PUT",
                                              headers: {
                                                "Content-Type":
                                                  "application/json",
                                              },
                                              body: JSON.stringify({
                                                image: url,
                                              }),
                                            }
                                          );
                                          if (!r.ok)
                                            throw new Error("Upload failed");
                                          toast({
                                            description:
                                              "Subcategory image updated",
                                          });
                                          await loadCategories();
                                        } catch (err: unknown) {
                                          toast({
                                            variant: "destructive",
                                            description:
                                              (err as Error)?.message ||
                                              "Failed to update image",
                                          });
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openEditSub(cat.id, s)}
                                    >
                                      <Pencil />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => deleteSubcategory(s.id)}
                                    >
                                      <Trash />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Category Dialog */}
      <Dialog open={openCat} onOpenChange={setOpenCat}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCat ? "Edit Category" : "New Category"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Name (EN)"
              value={catForm.name_en}
              onChange={(e) =>
                setCatForm({ ...catForm, name_en: e.target.value })
              }
            />
            <Input
              placeholder="Name (SW)"
              value={catForm.name_sw}
              onChange={(e) =>
                setCatForm({ ...catForm, name_sw: e.target.value })
              }
            />
            <Textarea
              placeholder="Description"
              value={catForm.description}
              onChange={(e) =>
                setCatForm({ ...catForm, description: e.target.value })
              }
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={catForm.sortOrder}
                onChange={(e) =>
                  setCatForm({ ...catForm, sortOrder: Number(e.target.value) })
                }
                className="w-32"
              />
              <UploadButton
                endpoint="imageUploader"
                content={{ button: "Upload Image" }}
                onClientUploadComplete={(res: { ufsUrl: string }[]) => {
                  if (!res?.[0]?.ufsUrl) return;
                  setCatForm((c) => ({ ...c, image: res[0].ufsUrl }));
                }}
              />
              {catForm.image && (
                <Image
                  src={catForm.image}
                  alt="preview"
                  className="h-10 w-16 object-cover rounded"
                  width={16}
                  height={10}
                />
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={saveCategory} className="flex-1">
                {editingCat ? "Update" : "Create"}
              </Button>
              <Button variant="ghost" onClick={() => setOpenCat(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={openSub} onOpenChange={setOpenSub}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSub ? "Edit Subcategory" : "New Subcategory"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name (EN)"
              value={subForm.name_en}
              onChange={(e) =>
                setSubForm({ ...subForm, name_en: e.target.value })
              }
            />
            <Input
              placeholder="Name (SW)"
              value={subForm.name_sw}
              onChange={(e) =>
                setSubForm({ ...subForm, name_sw: e.target.value })
              }
            />
            <Textarea
              placeholder="Description"
              value={subForm.description}
              onChange={(e) =>
                setSubForm({ ...subForm, description: e.target.value })
              }
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={subForm.sortOrder}
                onChange={(e) =>
                  setSubForm({ ...subForm, sortOrder: Number(e.target.value) })
                }
                className="w-28"
              />
              <UploadButton
                endpoint="imageUploader"
                content={{ button: "Upload Image" }}
                onClientUploadComplete={(res: { ufsUrl: string }[]) => {
                  if (res?.[0]?.ufsUrl)
                    setSubForm((s) => ({ ...s, image: res[0].ufsUrl }));
                }}
              />
              {subForm.image && (
                <Image
                  src={subForm.image}
                  alt="preview"
                  className="h-10 w-16 object-cover rounded"
                  width={16}
                  height={10}
                />
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={saveSubcategory} className="flex-1">
                {editingSub ? "Update Subcategory" : "Create Subcategory"}
              </Button>
              <Button variant="ghost" onClick={() => setOpenSub(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
