// app/[username]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/db/prisma"; // adjust path to your prisma instance
// import SupplierHome from "@/app/company/[id]/Home/page"; // reuse the existing component if possible
import SupplierHomePage from "../company/[supplierId]/home/page"; // reuse the existing component if possible
import { Metadata } from "next";
import { plainDescription, publicUrl, sellerPath } from "@/lib/storefront-seo";

export async function generateMetadata({params}:{params:Promise<{username:string}>}):Promise<Metadata>{const {username}=await params;const supplier=await prisma.supplier.findUnique({where:{username},select:{id:true,name:true,companyName:true,description:true}});if(!supplier)return {title:"Duka halijapatikana",robots:{index:false,follow:true}};return {title:`${supplier.companyName||supplier.name} — Duka`,description:plainDescription(supplier.description||"Angalia bidhaa za duka hili kwenye Nimboya."),alternates:{canonical:publicUrl(sellerPath(supplier.id))}};}

export default async function SupplierUsernamePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const RESERVED_ROUTES = ["login", "register", "about", "company"];

  if (RESERVED_ROUTES.includes(username.toLowerCase())) {
    notFound();
  }

  const supplier = await prisma.supplier.findUnique({
    where: { username: username },
  });

  if (!supplier) {
    notFound();
  }

  // adapt the async param signature your HomePage expects:
  const supplierParams = Promise.resolve({ supplierId: supplier.id });

  // ✅ Option 1: reuse the existing SupplierHome component
  return <SupplierHomePage params={supplierParams} />;

  // ✅ Option 2: if SupplierHome is complex or uses fetches by ID,
  // you can render your own component here passing supplier data
}
