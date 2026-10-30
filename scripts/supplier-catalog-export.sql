-- OWNER-RUN ONLY on the source book. No credentials, user contacts or transaction rows.
-- Keep the result private. This is an export snapshot, NOT an approved import manifest.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL TIME ZONE 'UTC';
WITH limits AS (
 SELECT (SELECT count(*) FROM "Supplier") <= 10000
    AND (SELECT count(*) FROM "Product") <= 10000
    AND (SELECT count(*) FROM "Brand") <= 10000
    AND (SELECT count(*) FROM "Category") <= 10000
    AND (SELECT count(*) FROM "Subcategory") <= 10000
    AND (SELECT count(*) FROM "ProductPricing") <= 100000
    AND (SELECT count(*) FROM "ProductVariant") <= 100000 AS safe
)
SELECT CASE WHEN NOT safe THEN jsonb_build_object('status','BLOCKED_EXPORT_TOO_LARGE') ELSE jsonb_build_object(
 'version',1, 'status','SOURCE_SNAPSHOT_NOT_REVIEWED', 'capturedAt',transaction_timestamp(),
 'suppliers',COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'id',s.id,'sourceUserId',s."userId",'name',s.name,'companyName',s."companyName",
   'username',s.username,'about',s.about,'tagLine',s."tagLine",'logo',s.logo,'bannerUrl',s."bannerUrl",'createdAt',s."createdAt" AT TIME ZONE 'UTC') ORDER BY s.id) FROM "Supplier" s),'[]'::jsonb),
 'brands',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'description',b.description,'image',b.image) ORDER BY b.id) FROM "Brand" b),'[]'::jsonb),
 'categories',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name_en',c.name_en,'name_sw',c.name_sw,'image',c.image,'description',c.description,'parentId',c."parentId",'sortOrder',c."sortOrder") ORDER BY c.id) FROM "Category" c),'[]'::jsonb),
 'subcategories',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name_en',s.name_en,'name_sw',s.name_sw,'categoryId',s."categoryId",'image',s.image,'description',s.description,'sortOrder',s."sortOrder") ORDER BY s.id) FROM "Subcategory" s),'[]'::jsonb),
 'products',COALESCE((SELECT jsonb_agg(jsonb_build_object(
 'id',p.id,'name',p.name,'slug',p.slug,'description',p.description,'images',p.images,'banner',p.banner,
 'price',p.price::text,'sourceStockSnapshot',p.stock,'color',p.color,'size',p.size,'supplierId',p."supplierId",'isFeatured',p."isFeatured",'createdAt',p."createdAt" AT TIME ZONE 'UTC',
 'brandId',p."brandId",'categoryId',p."categoryId",'subcategoryId',p."subcategoryId",'thumbnail',p.thumbnail,'tags',p.tags,'videoUrl',p."videoUrl") ORDER BY p.id) FROM "Product" p),'[]'::jsonb),
 'tiers',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'productId',t."productId",'minQty',t."minQty",'price',t.price::text) ORDER BY t.id) FROM "ProductPricing" t),'[]'::jsonb),
 'variants',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'productId',v."productId",'sku',v.sku,'name',v.name,'price',v.price::text,'sourceStockSnapshot',v.stock,'image',v.image) ORDER BY v.id) FROM "ProductVariant" v),'[]'::jsonb)
) END AS supplier_catalog_snapshot FROM limits;
ROLLBACK;
