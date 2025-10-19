"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Image from "next/image";
import { UploadButton } from "@/lib/uploadthing";
import { Trash2, Pencil, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Brand = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  createdAt: string;
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState({ name: "", description: "", image: "" });

  // Fetch brands
  useEffect(() => {
    fetch("/api/admin/brands")
      .then((res) => res.json())
      .then(setBrands)
      .catch(() => {
        toast({ variant: "destructive", description: "Failed to load brands" });
      });
  }, []);

  const resetForm = () => {
    setForm({ name: "", description: "", image: "" });
    setEditing(null);
  };

  // Handle create/update
  const handleSave = async () => {
    if (!form.name.trim())
      return toast({
        variant: "destructive",
        description: "Brand name required",
      });
    const method = editing ? "PUT" : "POST";
    const url = editing
      ? `/api/admin/brands/${editing.id}`
      : "/api/admin/brands";

    const res = await fetch(url, {
      method,
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast({
        variant: "destructive",
        description: editing ? "Brand updated" : "Brand created",
      });
      const updated = await fetch("/api/admin/brands").then((r) => r.json());
      setBrands(updated);
      setOpen(false);
      resetForm();
    } else {
      toast({
        variant: "destructive",
        description: "Failed to save brand",
      });
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brand?")) return;
    const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({
        variant: "default",
        description: "Brand deleted",
      });
      setBrands((prev) => prev.filter((b) => b.id !== id));
    } else
      toast({
        variant: "destructive",
        description: "Failed to delete brand",
      });
  };

  return (
    <Card className="p-4">
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="text-xl font-bold">Manage Brands</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm();
                setOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Brand" : "Add New Brand"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Samsung"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Short brand description"
                />
              </div>
              <div>
                <Label>Image</Label>
                <UploadButton
                  endpoint="imageUploader"
                  content={{ button: "Upload Image" }}
                  onClientUploadComplete={(res: { ufsUrl: string }[]) => {
                    if (!res?.[0]?.ufsUrl) return;
                    setForm((f) => ({ ...f, image: res[0].ufsUrl }));
                  }}
                />
                {form.image && (
                  <Image
                    src={form.image}
                    alt="Brand"
                    width={80}
                    height={80}
                    className="mt-2 rounded object-cover border"
                  />
                )}
              </div>
              <Button onClick={handleSave} className="w-full">
                {editing ? "Update Brand" : "Save Brand"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-3">
        {brands.length === 0 && (
          <p className="text-muted-foreground text-sm">No brands yet.</p>
        )}

        {brands.map((brand) => (
          <div
            key={brand.id}
            className="flex items-center justify-between border p-3 rounded-lg hover:bg-muted/30 transition"
          >
            <div className="flex items-center gap-3">
              {brand.image && (
                <Image
                  src={brand.image}
                  alt={brand.name}
                  width={50}
                  height={50}
                  className="rounded border object-cover"
                />
              )}
              <div>
                <p className="font-semibold">{brand.name}</p>
                {brand.description && (
                  <p className="text-sm text-muted-foreground">
                    {brand.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Added: {new Date(brand.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing(brand);
                  setForm({
                    name: brand.name,
                    description: brand.description || "",
                    image: brand.image || "",
                  });
                  setOpen(true);
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(brand.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
