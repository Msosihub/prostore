"use client";

import { useEffect, useState } from "react";
import {
  useForm,
  // Controller
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Trash, Download, ImagePlus, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { UploadButton } from "@/lib/uploadthing";

type SupplierDocumentPayload = {
  label: string;
  name?: string;
  visibleToBuyers: boolean;
  validUntil?: Date;
  certNumber?: string;
  description?: string | null;
  source?: string | null;
  type?: string;
  files: string[]; // array of uploaded file URLs
};

type SupplierDocument = {
  id: string;
  supplierId: string;
  label: string;
  name: string;
  description?: string | null;
  source?: string | null;
  visibleToBuyers: boolean | null;
  type?: string | null;
  fileUrl: string | null;
  files?: string[] | null;
  verified: boolean;
  uploadedAt: string;
};

export default function SupplierDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<SupplierDocument[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const form = useForm<SupplierDocumentPayload>({
    defaultValues: {
      label: "",
      name: "",
      visibleToBuyers: false,
      validUntil: undefined,
      certNumber: "",
      description: "",
      source: "",
      type: "",
      files: [],
    },
  });

  const { register, handleSubmit, reset, watch } = form;

  // Fetch supplier documents on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/suppliers/documents");
        if (!res.ok) throw new Error("Failed to load documents");
        const data = await res.json();
        // console.log("Fetched documents:", data);
        if (mounted) setDocs(data || []);
      } catch (err: unknown) {
        console.error(err);
        toast({
          variant: "destructive",
          description: (err as Error)?.message || "Error",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Upload flow: UploadButton returns array of { ufsUrl }
  async function onClientUploadComplete(res: { ufsUrl: string }[]) {
    // store uploaded urls into form.files for preview, but we will immediately create the document after clicking Create
    setUploading(false);
    const newUrls = res.map((r) => r.ufsUrl);
    const existing = watch("files") || [];
    const merged = [...existing, ...newUrls].slice(0, 20); // safety cap
    // Note: react-hook-form's register does not provide setter here — using reset to update partial values
    reset({ ...watch(), files: merged });
    toast({
      title: "Uploaded",
      description: `${newUrls.length} file(s) uploaded`,
    });
  }

  async function onSubmit(payload: SupplierDocumentPayload) {
    // payload.files expected to be array of file urls from upload
    if (!payload.files || payload.files.length === 0) {
      toast({
        variant: "destructive",
        description: "Upload at least one file.",
      });
      return;
    }
    // console.log("Creating document with", payload);
    setSubmitting(true);
    try {
      const res = await fetch("/api/suppliers/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Failed to create document");
      }

      const created: SupplierDocument = await res.json();
      setDocs((d) => [created, ...d]);
      toast({ title: "Saved", description: "Document uploaded and saved." });
      reset({ label: "", name: "", type: "", files: [] });
    } catch (err: unknown) {
      console.error(err);
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to save",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // function getFileType(url: string): string {
  //   const ext = url.split(".").pop()?.toLowerCase();
  //   if (!ext) return "Unknown";
  //   if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "Image";
  //   if (["pdf"].includes(ext)) return "PDF";
  //   if (["doc", "docx"].includes(ext)) return "DOC";
  //   if (["xls", "xlsx"].includes(ext)) return "Excel";
  //   return ext.toUpperCase();
  // }

  async function handleDelete(id: string) {
    if (!confirm("Una hakika? Delete this document?")) return;
    try {
      const res = await fetch("/api/suppliers/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDocs((d) => d.filter((x) => x.id !== id));
      toast({ title: "Deleted", description: "Document removed." });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message || "Failed to delete",
      });
    }
  }

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <h1 className="text-2xl font-bold">Supplier Documents</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pakia document mpya</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormItem>
                <FormLabel>Aina</FormLabel>
                <FormControl>
                  <select {...register("type")} className="input">
                    <option value="">Chagua aina</option>
                    <option value="License">Leseni</option>
                    <option value="Catalog">Katalogi</option>
                    <option value="Certificate">Cheti</option>
                    <option value="Other">Nyingine</option>
                  </select>
                </FormControl>
              </FormItem>

              <FormItem>
                <FormLabel>Label</FormLabel>
                <FormControl>
                  <Input
                    {...register("label", { required: true })}
                    placeholder="mfn Leseni, Cheti cha Usajili, n.k"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>

              <FormItem>
                <FormLabel>Jina (si lazima)</FormLabel>
                <FormControl>
                  <Input
                    {...register("name")}
                    placeholder="Jina la faili/maelezo mafupi"
                  />
                </FormControl>
              </FormItem>

              <FormItem>
                <FormLabel>Maelezo</FormLabel>
                <FormControl>
                  <Input
                    {...register("description")}
                    placeholder="Maelezo mafupi au maelezo"
                  />
                </FormControl>
              </FormItem>

              <FormItem>
                <FormLabel>Chanzo</FormLabel>
                <FormControl>
                  <Input
                    {...register("source")}
                    placeholder="Mamlaka au chanzo/TRA"
                  />
                </FormControl>
              </FormItem>

              {watch("type") === "Certificate" ||
              watch("type") === "License" ? (
                <FormItem>
                  <FormLabel>Leseni / Cheti Namba</FormLabel>
                  <FormControl>
                    <Input
                      {...register("certNumber")}
                      placeholder="mfn TRA-123456"
                    />
                  </FormControl>
                </FormItem>
              ) : null}

              {watch("type") === "Certificate" ||
              watch("type") === "License" ? (
                <FormItem>
                  <FormLabel>Mwisho wa Leseni</FormLabel>
                  <FormControl>
                    <Input type="date" {...register("validUntil")} />
                  </FormControl>
                </FormItem>
              ) : null}

              <FormItem>
                <FormControl>
                  <input
                    type="checkbox"
                    {...register("visibleToBuyers")}
                    className="checkbox"
                  />
                </FormControl>
                <FormLabel> Onyesho kwa wanunuzi?</FormLabel>
                <FormMessage />
              </FormItem>

              <FormItem>
                <FormLabel>Files (pakia)</FormLabel>
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
                    onClientUploadComplete={onClientUploadComplete}
                    onUploadError={(err) => {
                      setUploading(false);
                      toast({
                        variant: "destructive",
                        description: err?.message || "Upload error",
                      });
                    }}
                  />
                </FormControl>
                <div className="text-xs text-muted-foreground mt-2">
                  Unaweza kupakia faili nyingi. Max 4MB
                </div>
              </FormItem>

              {/* Preview uploaded files */}
              <div>
                <h4 className="text-sm font-medium">Files zilizopakiwa</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {(watch("files") || []).map((url: string, i: number) => (
                    <div key={i} className="relative rounded overflow-hidden">
                      <a
                        className="block"
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {/* If image, show thumbnail; otherwise show file icon. We'll show <img> and fallback */}
                        <Image
                          src={url}
                          width={128}
                          height={112}
                          className="object-cover rounded"
                          alt={`file-${i}`}
                        />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Inahifadhi..." : "Hifadhi Document"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Existing documents list */}
      <Card>
        <CardHeader>
          <CardTitle>Documents Zako</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div>Inapakia...</div>
          ) : docs.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Hakuna hati zilizopakiwa bado.
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 border rounded p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 flex items-center justify-center rounded bg-muted">
                      {/* thumbnail */}
                      {d.fileUrl?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <Image
                          src={d.fileUrl}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          alt={d.label}
                        />
                      ) : (
                        <div className="text-xs">FILE</div>
                      )}
                      {/* <div className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                        {getFileType(d.fileUrl || "")}
                      </div> */}
                    </div>

                    <div>
                      <div className="font-medium">{d.label}</div>
                      <div
                        className="text-xs text-muted-foreground truncate max-w-[200px]"
                        title={d.name || d.fileUrl || ""}
                      >
                        {d.name || d.fileUrl}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.type || "—"} • uploaded{" "}
                        {new Date(d.uploadedAt).toLocaleString()}
                      </div>
                      <div
                        className={` py-1 rounded text-xs ${
                          d.visibleToBuyers
                            ? " text-blue-800"
                            : " text-green-600"
                        }`}
                      >
                        {d.visibleToBuyers
                          ? "Inaonekana kwa Wanunuzi"
                          : "Binafsi"}
                      </div>
                      {/* {d.validUntil && new Date(d.validUntil) < new Date() && (
                        <div className="text-xs text-red-600">Expired</div>
                      )} */}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={(d.files && d.files[0]) || d.fileUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="ghost" size="sm" title="Download / view">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>

                    <div
                      className={`px-2 py-1 rounded text-sm ${d.verified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                    >
                      {d.verified ? "Imethibitishwa" : "Inasubiri"}
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(d.id)}
                    >
                      <Trash className="w-4 h-4" />
                    </Button>
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
