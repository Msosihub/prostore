// Rehearse export/review/import using only the disposable synthetic seed.
const fs=require('fs'),path=require('path');
const state=JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));Object.assign(process.env,state.env);
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',esModuleInterop:true}});
require('tsconfig-paths').register({baseUrl:state.stage,paths:{'@/*':['*']}});
(async()=>{
 const {prisma}=require(state.stage+'/tests/integration/database.cjs');
 const {prepareSupplierCatalogTransfer,supplierSnapshotDigest}=require(state.stage+'/lib/supplier-catalog-transfer.ts');
 const {rehearseSupplierCatalogTransfer}=require(state.stage+'/tests/integration/catalog-launch.cjs');
 const client=new(require(state.stage+'/tests/integration/node_modules/pg').Client)({connectionString:state.env.PROSTORE_TEST_DATABASE_URL});
 try{
  await client.connect();const results=await client.query(fs.readFileSync(path.join(state.stage,'scripts/supplier-catalog-export.sql'),'utf8'));const snapshot=results.find(r=>r.rows?.[0]?.supplier_catalog_snapshot).rows[0].supplier_catalog_snapshot;
  const review={version:1,snapshotDigest:supplierSnapshotDigest(snapshot),priorTransactionsAreTrials:true,preserveSourceDatabase:true,completenessReviewed:true,
   accounts:snapshot.suppliers.map(s=>({sourceUserId:s.sourceUserId,targetUserId:s.sourceUserId,ownershipReviewed:true})),
   stock:[...snapshot.products.map(p=>({kind:'product',id:p.id,openingStock:30,stockReviewed:true})),...snapshot.variants.map(p=>({kind:'variant',id:p.id,openingStock:2,stockReviewed:true}))]};
  const {input}=prepareSupplierCatalogTransfer(snapshot,review);
  await prisma.productPricing.deleteMany();await prisma.productVariant.deleteMany();await prisma.product.deleteMany();await prisma.subcategory.deleteMany();await prisma.category.deleteMany();await prisma.brand.deleteMany();await prisma.supplier.deleteMany();
  await prisma.user.update({where:{id:state.fixture.vendor},data:{phoneVerified:new Date()}});
  await rehearseSupplierCatalogTransfer(input);
  state.fixture.transferred=true;fs.writeFileSync(process.env.PROSTORE_BROWSER_STATE,JSON.stringify(state));
  console.log('PASS synthetic supplier/catalog transfer seeded with original IDs and pending approval');
 }finally{await client.end();await prisma.$disconnect();}
})().catch(e=>{console.error('Synthetic transfer seed failed',e.name,e.code,JSON.stringify(e.issues?.map(i=>({path:i.path,code:i.code}))));process.exitCode=1});
