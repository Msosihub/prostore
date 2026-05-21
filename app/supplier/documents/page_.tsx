// "use client";

// import { useEffect, useState, useTransition } from "react";
// import { useForm, SubmitHandler } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import * as z from "zod";
// import Image from "next/image";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue
// } from "@/components/ui/select";
// import { useToast } from "@/hooks/use-toast";
// import {
//   Loader2,
//   UploadCloud,
//   Trash2,
//   Download,
//   FileText,
//   ShieldCheck,
//   Clock,
//   XCircle,
//   Eye,
//   EyeOff,
//   Calendar,
//   Info,
//   Plus,
//   Badge
// } from "lucide-react";
// import { UploadButton } from "@/lib/uploadthing"; // Adjust based on your configuration path
// import { formatDateTime } from "@/lib/utils";

// // 🟢 STABLE CORE SCHEMA: Non-optional default values align perfectly with form inputs
// const supplierDocumentFormSchema = z.object({
//   type: z.string().min(1, "Tafadhali chagua aina ya hati"),
//   label: z.string().min(1, "Kichwa cha habari (Label) kinahitajika"),
//   name: z.string().default(""),
//   description: z.string().default(""),
//   source: z.string().default(""),
//   certNumber: z.string().default(""),
//   validUntil: z.string().default(""),
//   visibleToBuyers: z.boolean().default(false),
//   files: z.array(z.string()).min(1, "Pakia angalau faili moja"),
// });

// // 🟢 TRUE FORM TYPE HARNESS: Extracted directly from Zod to prevent compiler mismatches
// type ProductDocumentFormValues = z.infer<typeof supplierDocumentFormSchema>;

// type SupplierDocument = {
//   id: string;
//   supplierId: string;
//   label: string;
//   name: string;
//   description?: string | null;
//   source?: string | null;
//   status: "PENDING" | "APPROVED" | "REJECTED";
//   visibleToBuyers: boolean;
//   type?: string | null;
//   fileUrl: string | null;
//   files?: string[] | null;
//   verified: boolean;
//   uploadedAt: string;
//   certNumber?: string | null;
//   validUntil?: string | null;
//   rejectionReason?: string | null;
// };

// export default function SupplierDocumentsPage() {
//   const { toast } = useToast();
//   const [isPending, startTransition] = useTransition();
//   const [loading, setLoading] = useState(true);
//   const [docs, setDocs] = useState<SupplierDocument[]>([]);
//   const [uploading, setUploading] = useState(false);

//   // 🟢 FIXED FORM CONTROLLER: Tied strictly to the inferred values matrix schema
//   const form = useForm<ProductDocumentFormValues>({
//     resolver: zodResolver(supplierDocumentFormSchema),
//     defaultValues: {
//       type: "",
//       label: "",
//       name: "",
//       description: "",
//       source: "",
//       certNumber: "",
//       validUntil: "",
//       visibleToBuyers: false,
//       files: [],
//     },
//   });

//   const { watch, setValue, handleSubmit, reset, control } = form;
//   const watchType = watch("type");
//   const watchFiles = watch("files") || [];

//   useEffect(() => {
//     let isMounted = true;
//     async function fetchDocuments() {
//       try {
//         const res = await fetch("/api/suppliers/documents");
//         if (!res.ok) throw new Error("Failed to load documents");
//         const data = await res.json();
//         if (isMounted) setDocs(data || []);
//       } catch (err: any) {
//         console.error(err);
//         toast({ variant: "destructive", description: err.message || "Mawasiliano na seva yamefeli" });
//       } finally {
//         if (isMounted) setLoading(false);
//       }
//     }
//     fetchDocuments();
//     return () => { isMounted = false; };
//   }, [toast]);

//   const onClientUploadComplete = (res: any) => {
//     setUploading(false);
//     const newUrls = res.map((r: any) => r.url || r.ufsUrl);
//     const existing = form.getValues("files") || [];
//     setValue("files", [...existing, ...newUrls], { shouldValidate: true });
//     toast({ title: "Mpakio Umekamilika! 🚀", description: `Faili ${newUrls.length} zimeongezwa kwa mafanikio.` });
//   };

//   const onSubmit: SubmitHandler<ProductDocumentFormValues> = async (payload) => {
//     if (!payload.files || payload.files.length === 0) {
//       toast({ variant: "destructive", description: "Tafadhali pakia angalau nakala moja ya hati yako." });
//       return;
//     }

//     startTransition(async () => {
//       try {
//         const res = await fetch("/api/suppliers/documents", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(payload),
//         });

//         if (!res.ok) {
//           const errData = await res.json().catch(() => null);
//           throw new Error(errData?.error || "Imeshindikana kuhifadhi hati.");
//         }

//         const createdDoc: SupplierDocument = await res.json();
//         setDocs((prev) => [createdDoc, ...prev]);

//         toast({ description: "Hati imehifadhiwa na inasubiri uhakiki wa usimamizi sasa!" });
//         reset({ type: "", label: "", name: "", description: "", source: "", certNumber: "", validUntil: "", visibleToBuyers: false, files: [] });
//       } catch (err: any) {
//         console.error(err);
//         toast({ variant: "destructive", description: err.message || "Hitilafu imetokea wakati wa kuhifadhi." });
//       }
//     });
//   };

//   const handleDelete = async (id: string) => {
//     if (!confirm("Je, una uhakika unataka kuondoa kabisa hati hii kwenye mfumo wetu?")) return;
//     try {
//       const res = await fetch("/api/suppliers/documents", {
//         method: "DELETE",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id }),
//       });
//       if (!res.ok) throw new Error("Deletion processing rejected");
//       setDocs((prev) => prev.filter((x) => x.id !== id));
//       toast({ description: "Hati imeondolewa kikamilifu ghalani." });
//     } catch (err: any) {
//       toast({ variant: "destructive", description: "Imeshindikana kufuta hati hii." });
//     }
//   };

//   return (
//     <div className="w-full max-w-5xl mx-auto space-y-6 select-none pt-2 pb-12">

//       <div className="flex flex-col space-y-0.5 px-1">
//         <h1 className="text-base font-extrabold md:text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
//           <ShieldCheck className="w-5 h-5 text-slate-700" />
//           Vyeti na Leseni za Biashara (Documents Hub)
//         </h1>
//         <p className="text-xs text-slate-400">Pakia leseni za biashara, vyeti vya ubora au katalogi kukuza uaminifu wa duka lako.</p>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

//         {/* Upload Form Area */}
//         <div className="lg:col-span-1">
//           <Card className="shadow-sm border-slate-100 bg-white rounded-2xl overflow-hidden">
//             <CardHeader className="p-4 bg-slate-50/40 border-b border-slate-100">
//               <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Pakia Hati Mpya</CardTitle>
//             </CardHeader>
//             <CardContent className="p-4">
//               <Form {...form}>
//                 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

//                   <FormField
//                     control={control}
//                     name="type"
//                     render={({ field }) => (
//                       <FormItem className="space-y-1">
//                         <FormLabel className="text-xs font-semibold text-slate-700">Aina ya Hati *</FormLabel>
//                         <Select onValueChange={field.onChange} value={field.value || ""}>
//                           <FormControl>
//                             <SelectTrigger className="h-10 text-xs rounded-xl focus:ring-orange-500 bg-slate-50/30">
//                               <SelectValue placeholder="Chagua aina" />
//                             </SelectTrigger>
//                           </FormControl>
//                           <SelectContent className="bg-white text-xs rounded-xl z-50">
//                             <SelectItem value="License" className="cursor-pointer">Leseni ya Biashara</SelectItem>
//                             <SelectItem value="Catalog" className="cursor-pointer">Katalogi ya Bidhaa</SelectItem>
//                             <SelectItem value="Certificate" className="cursor-pointer">Cheti cha Ubora (TBS/TFDA)</SelectItem>
//                             <SelectItem value="Other" className="cursor-pointer">Nyaraka Nyingine</SelectItem>
//                           </SelectContent>
//                         </Select>
//                         <FormMessage className="text-[11px]" />
//                       </FormItem>
//                     )}
//                   />

//                   <FormField
//                     control={control}
//                     name="label"
//                     render={({ field }) => (
//                       <FormItem className="space-y-1">
//                         <FormLabel className="text-xs font-semibold text-slate-700">Jina la Hati (Label) *</FormLabel>
//                         <FormControl>
//                           <Input placeholder="Mf. BRELA, TIN au Leseni ya Manispaa" className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30" {...field} />
//                         </FormControl>
//                         <FormMessage className="text-[11px]" />
//                       </FormItem>
//                     )}
//                   />

//                   <FormField
//                     control={control}
//                     name="description"
//                     render={({ field }) => (
//                       <FormItem className="space-y-1">
//                         <FormLabel className="text-xs font-semibold text-slate-700">Maelezo (Description)</FormLabel>
//                         <FormControl>
//                           <Input placeholder="Maelezo mafupi ya hati hii..." className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30" {...field} />
//                         </FormControl>
//                         <FormMessage className="text-[11px]" />
//                       </FormItem>
//                     )}
//                   />

//                   <FormField
//                     control={control}
//                     name="source"
//                     render={({ field }) => (
//                       <FormItem className="space-y-1">
//                         <FormLabel className="text-xs font-semibold text-slate-700">Mamlaka Iliyotoa (Source)</FormLabel>
//                         <FormControl>
//                           <Input placeholder="Mf. TRA, BRELA, TBS, n.k" className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-slate-50/30" {...field} />
//                         </FormControl>
//                         <FormMessage className="text-[11px]" />
//                       </FormItem>
//                     )}
//                   />

//                   {(watchType === "Certificate" || watchType === "License") && (
//                     <div className="space-y-3 p-3 bg-slate-50/60 rounded-xl border border-slate-100/60 animate-in fade-in duration-200">
//                       <FormField
//                         control={control}
//                         name="certNumber"
//                         render={({ field }) => (
//                           <FormItem className="space-y-1">
//                             <FormLabel className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Namba ya Cheti / Leseni *</FormLabel>
//                             <FormControl>
//                               <Input placeholder="Mfano: TRA-9988221" className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-white border-slate-200 font-mono font-bold" {...field} />
//                             </FormControl>
//                             <FormMessage className="text-[11px]" />
//                           </FormItem>
//                         )}
//                       />

//                       <FormField
//                         control={control}
//                         name="validUntil"
//                         render={({ field }) => (
//                           <FormItem className="space-y-1">
//                             <FormLabel className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tarehe ya Kuisha (Expiry Date) *</FormLabel>
//                             <FormControl>
//                               <Input type="date" className="h-10 text-xs focus-visible:ring-orange-500 rounded-xl bg-white border-slate-200 font-mono" {...field} />
//                             </FormControl>
//                             <FormMessage className="text-[11px]" />
//                           </FormItem>
//                         )}
//                       />
//                     </div>
//                   )}

//                   <FormField
//                     control={control}
//                     name="visibleToBuyers"
//                     render={({ field }) => (
//                       <FormItem className="flex flex-row items-start space-x-2 space-y-0 py-1 select-none">
//                         <FormControl>
//                           <Checkbox checked={field.value} onCheckedChange={field.onChange} className="rounded-md border-slate-300 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600" />
//                         </FormControl>
//                         <FormLabel className="text-xs font-semibold text-slate-500 cursor-pointer">Onyesha cheti hiki hadharani kwa wanunuzi</FormLabel>
//                       </FormItem>
//                     )}
//                   />

//                   <div className="space-y-1.5 pt-1">
//                     <FormLabel className="text-xs font-semibold text-slate-700">Pakia Nakala Maalum (Files Upload) *</FormLabel>
//                     <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer relative min-h-[90px]">
//                       <UploadButton
//                         endpoint="imageUploader"
//                         multiple={true} // 🟢 NATIVE PARAMETER POSITION FIX
//                         onUploadBegin={() => setUploading(true)}
//                         appearance={{
//                           button: "bg-slate-900 text-white text-[11px] font-bold h-8 px-3.5 rounded-lg shadow-sm cursor-pointer hover:bg-slate-800 transition-colors",
//                           allowedContent: "text-[9px] text-slate-400 font-medium mt-1"
//                         }}
//                         content={{ button: "Chagua Nyaraka" }}
//                         onClientUploadComplete={onClientUploadComplete}
//                         onUploadError={(err: any) => {
//                           setUploading(false);
//                           toast({ variant: "destructive", description: err?.message || "Hitilafu wakati wa kupakia." });
//                         }}
//                       />

//                       {uploading && (
//                         <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl text-slate-800">
//                           <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
//                           <span>Mifumo inasoma faili...</span>
//                         </div>
//                       )}
//                     </div>
//                   </div>

//                   {watchFiles.length > 0 && (
//                     <div className="space-y-1">
//                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Faili Zilizopakiwa ({watchFiles.length})</span>
//                       <div className="grid grid-cols-4 gap-2 pt-0.5">
//                         {watchFiles.map((url, i) => (
//                           <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-100 shadow-inner bg-slate-50 flex items-center justify-center p-1 group">
//                             {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
//                               <Image src={url} alt={`upload-${i}`} fill className="object-cover" />
//                             ) : (
//                               <FileText className="w-5 h-5 text-slate-400" />
//                             )}
//                             <button
//                               type="button"
//                               onClick={() => setValue("files", watchFiles.filter((_, idx) => idx !== i), { shouldValidate: true })}
//                               className="absolute top-0.5 right-0.5 bg-slate-900/80 text-white rounded-full p-0.5 shadow-sm opacity-90 outline-none"
//                             >
//                               <XCircle className="w-3 h-3 fill-rose-500 text-white" />
//                             </button>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   <Button type="submit" disabled={isPending} className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-sm mt-2">
//                     {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" /> : <UploadCloud className="w-3.5 h-3.5" />}
//                     Hifadhi Document
//                   </Button>

//                 </form>
//               </Form>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Existing Documents List Display */}
//         <div className="lg:col-span-2 space-y-3">
//           <div className="flex items-center justify-between px-1">
//             <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Nyaraka Zilizohifadhiwa Kwenye Mfumo</h2>
//             <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] font-mono px-2 rounded-md">Jumla: {docs.length}</Badge>
//           </div>

//           {loading ? (
//             <div className="w-full flex justify-center py-12 bg-white border border-slate-100 rounded-2xl shadow-sm">
//               <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
//             </div>
//           ) : docs.length === 0 ? (
//             <div className="text-center py-16 bg-white border border-dashed rounded-2xl shadow-sm">
//               <p className="text-xs text-slate-400 italic">Hakuna nyaraka au vyeti vyovyote vilivyopakiwa kwenye duka hili bado.</p>
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               {docs.map((d) => {
//                 const isDocVerified = d.status === "APPROVED" || d.verified;
//                 const hasRejected = d.status === "REJECTED";
//                 const displayFileUrl = (d.files && d.files.length > 0) ? d.files[0] : d.fileUrl || "#";

//                 return (
//                   <div key={d.id} className="bg-white border border-slate-100 p-3.5 rounded-2xl shadow-sm flex flex-col justify-between gap-3 relative group">
//                     <div className="space-y-2.5">

//                       <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
//                         <div className="flex items-center gap-2 min-w-0">
//                           <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 relative">
//                             {displayFileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
//                               <Image src={displayFileUrl} alt="thumbnail" fill className="object-cover rounded-md" />
//                             ) : (
//                               <FileText className="w-4 h-4 text-slate-400" />
//                             )}
//                           </div>
//                           <div className="min-w-0">
//                             <p className="text-xs font-bold text-slate-800 truncate leading-tight" title={d.label}>{d.label}</p>
//                             <p className="text-[10px] text-slate-400 truncate leading-none pt-0.5">{d.type || "Nyaraka"}</p>
//                           </div>
//                         </div>

//                         <div className="shrink-0 transform scale-90 origin-right">
//                           {isDocVerified ? (
//                             <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
//                               <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Imethibitika
//                             </Badge>
//                           ) : hasRejected ? (
//                             <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
//                               <XCircle className="w-2.5 h-2.5 text-rose-500" /> Imekataliwa
//                             </Badge>
//                           ) : (
//                             <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
//                               <Clock className="w-2.5 h-2.5 text-amber-600 animate-pulse" /> Kagua...
//                             </Badge>
//                           )}
//                         </div>
//                       </div>

//                       <div className="space-y-1 text-xs font-medium">
//                         {d.certNumber && <p className="text-slate-700 font-mono text-[11px]">Namba: <span className="font-bold text-slate-900">{d.certNumber}</span></p>}
//                         {d.description && <p className="text-slate-500 leading-normal text-[11px] font-normal line-clamp-2">{d.description}</p>}

//                         <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-slate-400 font-medium">
//                           <span className="flex items-center gap-0.5">
//                             {d.visibleToBuyers ? <Eye className="w-3 h-3 text-blue-500" /> : <EyeOff className="w-3 h-3 text-slate-300" />}
//                             {d.visibleToBuyers ? "Hadharani (Public)" : "Binafsi (Private)"}
//                           </span>
//                         </div>

//                         {hasRejected && d.rejectionReason && (
//                           <div className="p-2 bg-rose-50/60 border border-rose-100 rounded-xl text-rose-800 text-[10px] leading-relaxed font-normal mt-1">
//                             <span className="font-bold text-rose-700">Sababu ya kukataliwa:</span> {d.rejectionReason}
//                           </div>
//                         )}
//                       </div>

//                     </div>

//                     <div className="flex items-center justify-between border-t border-slate-50 pt-2 bg-slate-50/30 -mx-3.5 -mb-3.5 p-2 rounded-b-2xl">
//                       <span className="text-[10px] text-slate-400 font-mono font-medium pl-1.5">
//                         {new Date(d.uploadedAt || (d as any).createdAt).toLocaleDateString("sw-TZ")}
//                       </span>

//                       <div className="flex items-center gap-1">
//                         <a href={displayFileUrl} target="_blank" rel="noreferrer" className="h-7 w-7 rounded-lg text-slate-400 hover:bg-white hover:text-slate-800 border border-transparent hover:border-slate-100 flex items-center justify-center shadow-none hover:shadow-sm transition-all">
//                           <Download className="w-3.5 h-3.5" />
//                         </a>
//                         <button type="button" onClick={() => handleDelete(d.id)} className="h-7 w-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 border border-transparent flex items-center justify-center transition-all">
//                           <Trash2 className="w-3.5 h-3.5" />
//                         </button>
//                       </div>
//                     </div>

//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>

//       </div>

//     </div>
//   );
// }
