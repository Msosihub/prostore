// "use client";

// import { useEffect, useState } from "react";
// import {
//   useForm,
//   // Controller
// } from "react-hook-form";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// // import { Textarea } from "@/components/ui/textarea";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
//   Form,
//   FormItem,
//   FormLabel,
//   FormControl,
//   FormMessage,
// } from "@/components/ui/form";
// import { Trash, Download } from "lucide-react";
// import Image from "next/image";
// import { toast } from "@/hooks/use-toast";
// import { UploadButton } from "@/lib/uploadthing";

// type SupplierDocumentPayload = {
//   label: string;
//   name?: string;
//   type?: string;
//   files: string[]; // array of uploaded file URLs
// };

// type SupplierDocument = {
//   id: string;
//   supplierId: string;
//   label: string;
//   name: string;
//   type?: string | null;
//   fileUrl: string | null;
//   files?: string[] | null;
//   verified: boolean;
//   uploadedAt: string;
// };

// export default function SupplierDocumentsPage() {
//   const [loading, setLoading] = useState(true);
//   const [docs, setDocs] = useState<SupplierDocument[]>([]);
//   const [submitting, setSubmitting] = useState(false);

//     const form = useForm({
//         resolver: zodResolver(formSchema),
//         defaultValues: {
//           name: "",
//           username: "",
//           about: "",
//           banner: "",
//           logo: "",
//           tagLine: "",
//           businessType: "", // default
//           nation: "",
//           location: "",
//           website: "",
//           email: "",
//           phone: "",
//           businessHours: DEFAULT_WORKING_HOURS,
//           policies: [],
//           gallery: [],
//         },
//       });

//   const { register, handleSubmit, reset, watch } =
//     useForm<SupplierDocumentPayload>({
//       defaultValues: {
//         label: "",
//         name: "",
//         type: "",
//         files: [],
//       },
//     });

//   // Fetch supplier documents on mount
//   useEffect(() => {
//     let mounted = true;
//     async function load() {
//       setLoading(true);
//       try {
//         const res = await fetch("/api/supplier/documents");
//         if (!res.ok) throw new Error("Failed to load documents");
//         const data = await res.json();
//         if (mounted) setDocs(data || []);
//       } catch (err: unknown) {
//         console.error(err);
//         toast({
//           variant: "destructive",
//           description: (err as Error)?.message || "Error",
//         });
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     }
//     load();
//     return () => {
//       mounted = false;
//     };
//   }, []);

//   // Upload flow: UploadButton returns array of { url }
//   async function onClientUploadComplete(res: { url: string }[]) {
//     // store uploaded urls into form.files for preview, but we will immediately create the document after clicking Create
//     const newUrls = res.map((r) => r.url);
//     const existing = watch("files") || [];
//     const merged = [...existing, ...newUrls].slice(0, 20); // safety cap
//     // Note: react-hook-form's register does not provide setter here — using reset to update partial values
//     reset({ ...watch(), files: merged });
//     toast({
//       title: "Uploaded",
//       description: `${newUrls.length} file(s) uploaded`,
//     });
//   }

//   async function onSubmit(payload: SupplierDocumentPayload) {
//     // payload.files expected to be array of file urls from upload
//     if (!payload.files || payload.files.length === 0) {
//       toast({
//         variant: "destructive",
//         description: "Upload at least one file.",
//       });
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const res = await fetch("/api/supplier/documents", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const err = await res.json().catch(() => null);
//         throw new Error(err?.error || "Failed to create document");
//       }

//       const created: SupplierDocument = await res.json();
//       setDocs((d) => [created, ...d]);
//       toast({ title: "Saved", description: "Document uploaded and saved." });
//       reset({ label: "", name: "", type: "", files: [] });
//     } catch (err: unknown) {
//       console.error(err);
//       toast({
//         variant: "destructive",
//         description: (err as Error)?.message || "Failed to save",
//       });
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   async function handleDelete(id: string) {
//     if (!confirm("Una hakika? Delete this document?")) return;
//     try {
//       const res = await fetch("/api/supplier/documents", {
//         method: "DELETE",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id }),
//       });
//       if (!res.ok) throw new Error("Failed to delete");
//       setDocs((d) => d.filter((x) => x.id !== id));
//       toast({ title: "Deleted", description: "Document removed." });
//     } catch (err: unknown) {
//       toast({
//         variant: "destructive",
//         description: (err as Error)?.message || "Failed to delete",
//       });
//     }
//   }

//   return (
//     <div className="container max-w-3xl py-6 space-y-6">
//       <h1 className="text-2xl font-bold">Supplier Documents</h1>

//       <Card>
//         <CardHeader>
//           <CardTitle>Upload new document</CardTitle>
//         </CardHeader>

//         <CardContent className="space-y-4">
//           <Form {...form}>
//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//               <FormItem>
//                 <FormLabel>Label</FormLabel>
//                 <FormControl>
//                   <Input
//                     {...register("label", { required: true })}
//                     placeholder="e.g. Business License"
//                   />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>

//               <FormItem>
//                 <FormLabel>Name (optional)</FormLabel>
//                 <FormControl>
//                   <Input
//                     {...register("name")}
//                     placeholder="File name/short description"
//                   />
//                 </FormControl>
//               </FormItem>

//               <FormItem>
//                 <FormLabel>Type</FormLabel>
//                 <FormControl>
//                   <select {...register("type")} className="input">
//                     <option value="">Select type</option>
//                     <option value="License">License</option>
//                     <option value="Catalog">Catalog</option>
//                     <option value="Certificate">Certificate</option>
//                     <option value="Other">Other</option>
//                   </select>
//                 </FormControl>
//               </FormItem>

//               <FormItem>
//                 <FormLabel>Files (upload)</FormLabel>
//                 <FormControl>
//                   <UploadButton
//                     endpoint="imageUploader"
//                     content={{ button: "Choose files to upload" }}
//                     onClientUploadComplete={onClientUploadComplete}
//                     onUploadError={(err) => {
//                       toast({
//                         variant: "destructive",
//                         description: err?.message || "Upload error",
//                       });
//                     }}
//                   />
//                 </FormControl>
//                 <div className="text-xs text-muted-foreground mt-2">
//                   You can upload multiple files. Max size and types are enforced
//                   by uploader.
//                 </div>
//               </FormItem>

//               {/* Preview uploaded files */}
//               <div>
//                 <h4 className="text-sm font-medium">Files preview</h4>
//                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
//                   {(watch("files") || []).map((url: string, i: number) => (
//                     <div key={i} className="relative rounded overflow-hidden">
//                       <a
//                         className="block"
//                         href={url}
//                         target="_blank"
//                         rel="noreferrer"
//                       >
//                         {/* If image, show thumbnail; otherwise show file icon. We'll show <img> and fallback */}
//                         <Image
//                           src={url}
//                           className="object-cover w-full h-28"
//                           alt={`file-${i}`}
//                         />
//                       </a>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <div>
//                 <Button type="submit" disabled={submitting}>
//                   {submitting ? "Saving..." : "Create Document"}
//                 </Button>
//               </div>
//             </form>
//           </Form>
//         </CardContent>
//       </Card>

//       {/* Existing documents list */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Your Documents</CardTitle>
//         </CardHeader>

//         <CardContent className="space-y-4">
//           {loading ? (
//             <div>Loading...</div>
//           ) : docs.length === 0 ? (
//             <div className="text-sm text-muted-foreground">
//               No documents uploaded yet.
//             </div>
//           ) : (
//             <div className="space-y-3">
//               {docs.map((d) => (
//                 <div
//                   key={d.id}
//                   className="flex items-center justify-between gap-3 border rounded p-3"
//                 >
//                   <div className="flex items-start gap-3">
//                     <div className="w-12 h-12 flex items-center justify-center rounded bg-muted">
//                       {/* thumbnail */}
//                       {d.fileUrl ? (
//                         <Image
//                           src={d.fileUrl}
//                           className="w-full h-full object-cover"
//                           alt={d.label}
//                         />
//                       ) : (
//                         <div className="text-xs">FILE</div>
//                       )}
//                     </div>

//                     <div>
//                       <div className="font-medium">{d.label}</div>
//                       <div className="text-sm text-muted-foreground">
//                         {d.name || d.type || "—"} • uploaded{" "}
//                         {new Date(d.uploadedAt).toLocaleString()}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="flex items-center gap-2">
//                     <a
//                       href={(d.files && d.files[0]) || d.fileUrl || "#"}
//                       target="_blank"
//                       rel="noreferrer"
//                     >
//                       <Button variant="ghost" size="sm" title="Download / view">
//                         <Download className="w-4 h-4" />
//                       </Button>
//                     </a>

//                     <div
//                       className={`px-2 py-1 rounded text-sm ${d.verified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
//                     >
//                       {d.verified ? "Verified" : "Pending"}
//                     </div>

//                     <Button
//                       variant="destructive"
//                       size="sm"
//                       onClick={() => handleDelete(d.id)}
//                     >
//                       <Trash className="w-4 h-4" />
//                     </Button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
