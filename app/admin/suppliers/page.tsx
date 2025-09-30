"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  // CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash, Check, X } from "lucide-react";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";

type SupplierSummary = {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  phone?: string | null;
  about?: string | null;
  companyName?: string | null;
  nation?: string | null;
  location?: string | null;
  responseTime?: string | null;
  isVerified: boolean;
  yearsActive?: number;
  logo?: string | null;
  latestDocument?: { id: string; label: string; uploadedAt: string } | null;
};

type EditForm = {
  label: string;
  companyName: string;
  yearsActive: number;
  isVerified: boolean;
  responseTime: string;
  about?: string | null;
  location: string;
  phone?: string;
  email: string;
};

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Edit modal state
  const [editing, setEditing] = useState<SupplierSummary | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    label: "",
    companyName: "",
    yearsActive: 1,
    isVerified: false,
    responseTime: "",
    about: "",
    phone: "",
    email: "",
    location: "",
  });

  useEffect(() => {
    loadSuppliers();
  }, [page, q]);

  async function loadSuppliers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/suppliers?${params.toString()}`);

      if (!res.ok) throw new Error("Failed to load suppliers");
      const json = await res.json();
      setSuppliers(json.data || []);
      setTotal(json.total || 0);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to load suppliers",
      });
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(s: SupplierSummary) {
    setEditing(s);
    setEditForm({
      label: s?.name || "",
      companyName: s.companyName || "",
      yearsActive: s.yearsActive || 1,
      responseTime: s?.responseTime || "",
      about: s.about || "",
      phone: s.phone || "",
      email: s.email,
      isVerified: s.isVerified,
      location: s?.nation || "",
    });
    setOpenEdit(true);
  }

  async function submitEdit() {
    if (!editing) return;
    try {
      const payload = {
        label: editForm.label,
        companyName: editForm.companyName,
        yearsActive: Number(editForm.yearsActive),
        isVerified: Boolean(editForm.isVerified),
        responseTime: editForm.responseTime || undefined,
        about: editForm.about || undefined,
        location: editForm.location || undefined,
        phone: editForm.phone || undefined,
        email: editForm.email || undefined,
      };
      const res = await fetch(`/api/admin/suppliers/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to update");
      }
      toast({ description: "Supplier updated" });
      setOpenEdit(false);
      await loadSuppliers();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to update supplier",
      });
    }
  }

  async function toggleVerify(s: SupplierSummary) {
    const newState = !s.isVerified;

    if (!confirm(`${newState ? "Verify" : "Unverify"} supplier "${s.name}"?`))
      return;
    try {
      const res = await fetch(`/api/admin/suppliers/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: newState }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed");
      }
      toast({
        description: `Supplier ${newState ? "verified" : "unverified"}`,
      });
      //send notification email to supplier about verification status change
      await fetch(`/api/admin/suppliers/${s.id}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: newState }),
      });
      await loadSuppliers();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to update supplier",
      });
    }
  }

  async function deleteSupplier(id: string) {
    if (!confirm("Delete supplier? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/suppliers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed");
      }
      toast({ description: "Supplier deleted" });
      await loadSuppliers();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to delete supplier",
      });
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin — Suppliers</h1>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search suppliers by name, email, company..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <Button onClick={() => loadSuppliers()}>Search</Button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div>Loading...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No suppliers found.
          </div>
        ) : (
          suppliers.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded overflow-hidden flex items-center justify-center">
                  {s.logo ? (
                    <Image
                      src={s.logo}
                      className="object-cover w-full h-full"
                      alt={s.name}
                      width={16}
                      height={16}
                    />
                  ) : (
                    <div className="text-sm">{s.name[0]}</div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">
                        {s.name}{" "}
                        {s.username ? (
                          <span className="text-sm text-muted-foreground">
                            ({s.username})
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {s.phone ? `${s.phone}` : ""}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {s.email} {s.companyName ? `• ${s.companyName}` : ""}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {s.nation ? s.nation : ""}
                      </div>
                      <div className="text-sm text-gray-600/80 ">
                        {s.location ? s.location : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={s.isVerified ? undefined : "secondary"}
                        className={`px-3 ${s.isVerified ? "bg-green-600/10 text-green-700 border-0" : "bg-red-600/10 text-red-700 border-0"}`}
                      >
                        {s.isVerified ? "Verified" : "Not verified"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(s)}
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </Button>
                      <Button size="sm" onClick={() => toggleVerify(s)}>
                        {s.isVerified ? (
                          <>
                            <X className="w-4 h-4 mr-1" />
                            Unverify
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                      <Link
                        href={`/admin/documents?supplierId=${s.id}`}
                        className="text-sm underline"
                      >
                        Docs
                      </Link>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteSupplier(s.id)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {s.latestDocument ? (
                    <div className="text-xs text-muted-foreground mt-2">
                      Latest doc: {s.latestDocument.label} •{" "}
                      {new Date(
                        s.latestDocument.uploadedAt
                      ).toLocaleDateString()}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Page {page} / {pageCount}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Label (e.g., Gold Supplier)"
              value={editForm.label}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, label: e.target.value }))
              }
            />
            <Input
              placeholder="Company name"
              value={editForm.companyName}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, companyName: e.target.value }))
              }
            />
            <Input
              placeholder="Company location"
              value={editForm.location}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, location: e.target.value }))
              }
            />
            <Input
              placeholder="Phone number"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
            <Input
              placeholder="Email address"
              value={editForm.email}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, location: e.target.value }))
              }
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Years active"
                value={editForm.yearsActive}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    yearsActive: Number(e.target.value),
                  }))
                }
                className="w-40"
              />
              <Input
                placeholder="Response time"
                value={editForm.responseTime}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, responseTime: e.target.value }))
                }
                className="w-40"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm">Verified</label>
                <input
                  type="checkbox"
                  checked={editForm.isVerified}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, isVerified: e.target.checked }))
                  }
                />
              </div>
            </div>

            <Textarea
              placeholder="Short bio/about"
              onChange={(e) =>
                setEditForm((f) => ({ ...f, about: e.target.value }))
              }
              value={editForm.about || ""}
            />

            <div className="flex gap-2">
              <Button onClick={submitEdit} className="flex-1">
                Save
              </Button>
              <Button variant="ghost" onClick={() => setOpenEdit(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
