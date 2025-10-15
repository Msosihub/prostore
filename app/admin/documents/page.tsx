"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  // Trash,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";

type SupplierMini = {
  id: string;
  name: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  isVerified?: boolean;
};

type Doc = {
  id: string;
  supplierId: string;
  label: string;
  name: string;
  type?: string | null;
  fileUrl?: string | null;
  files?: string[] | null;
  description?: string | null;
  visibleToBuyers?: boolean;
  validUntil?: string | null;
  verified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  uploadedAt: string;
  supplier: SupplierMini;
};

export default function AdminDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadDocs();
  }, []);

  async function loadDocs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/supplier-docs?verified=false");
      if (!res.ok) {
        throw new Error("Failed to load documents");
      }
      const data = await res.json();
      setDocs(data);
    } catch (err: unknown) {
      console.error(err);
      const errObj = err as Error;
      toast({
        variant: "destructive",
        description: errObj?.message || "Failed to load",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(doc: Doc) {
    if (!confirm(`Approve document "${doc.label}" for ${doc.supplier?.name}?`))
      return;
    setProcessingId(doc.id);
    try {
      const res = await fetch(`/api/admin/supplier-docs/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed");
      }
      // const updated =
      await res.json();
      // console.log("Updated doc:", updated);
      setDocs((d) => d.filter((x) => x.id !== doc.id));
      toast({
        title: "Approved",
        description: "Document approved and audit logged",
      });
    } catch (err: unknown) {
      console.error(err);
      const errObj = err as Error;
      toast({
        variant: "destructive",
        description: errObj?.message || "Failed to approve",
      });
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(doc: Doc) {
    const reason = prompt(
      "Enter rejection reason (visible to supplier):",
      doc.rejectionReason || ""
    );
    if (reason === null) return; // cancelled
    setProcessingId(doc.id);
    try {
      const res = await fetch(`/api/admin/supplier-docs/${doc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: false, rejectionReason: reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed");
      }
      setDocs((d) => d.filter((x) => x.id !== doc.id));
      toast({
        title: "Rejected",
        description: "Document rejected and audit logged",
      });
    } catch (err: unknown) {
      console.error(err);
      const errObj = err as Error;
      toast({
        variant: "destructive",
        description: errObj?.message || "Failed to reject",
      });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="container max-w-5xl py-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin - Documents Review</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pending Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No pending documents.
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start justify-between gap-4 border rounded p-3"
                >
                  <div className="flex gap-4 items-start">
                    <div className="w-20 h-20 bg-muted rounded overflow-hidden flex items-center justify-center">
                      {d.fileUrl ? (
                        <Image
                          src={d.fileUrl}
                          className="object-cover w-full h-full"
                          alt={d.label}
                          width={48}
                          height={48}
                        />
                      ) : d.files && d.files[0] ? (
                        <Image
                          src={d.files[0]}
                          className="object-cover w-full h-full"
                          alt={d.label}
                          width={48}
                          height={48}
                        />
                      ) : (
                        <div className="text-xs">FILE</div>
                      )}
                    </div>

                    <div>
                      <div className="font-semibold">{d.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {d.name || d.type} • uploaded{" "}
                        {new Date(d.uploadedAt).toLocaleString()}
                      </div>
                      <div className="text-sm">
                        Supplier:{" "}
                        <Link
                          href={`/admin/suppliers/${d.supplier.id}`}
                          className="font-medium underline"
                        >
                          {d.supplier.name} ({d.supplier.username || "—"})
                        </Link>
                        {d.supplier.isVerified ? (
                          <span className="ml-2 text-xs text-green-600">
                            Verified
                          </span>
                        ) : null}
                      </div>

                      {d.description ? (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {d.description}
                        </div>
                      ) : null}

                      {/* files list */}
                      {d.files && d.files.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {d.files.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm underline"
                            >
                              File {i + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(d)}
                        disabled={processingId === d.id}
                        title="Approve"
                      >
                        <Check className="w-4 h-4 mr-2" /> Approve
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(d)}
                        disabled={processingId === d.id}
                        title="Reject"
                      >
                        <X className="w-4 h-4 mr-2" /> Reject
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {/* show verifiedAt if recently processed */}
                      {d.verified ? "Verified" : "Pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
