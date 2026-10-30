// Rehearse export/review/import using only the disposable synthetic seed.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const state=JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));Object.assign(process.env,state.env);
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'Node',esModuleInterop:true}});
require('tsconfig-paths').register({baseUrl:state.stage,paths:{'@/*':['*']}});
(async()=>{
 const {prisma}=require(state.stage+'/tests/integration/database.cjs');
 const {prepareSupplierCatalogTransfer}=require(state.stage+'/lib/supplier-catalog-transfer.ts');
 const {draftSupplierTransferReview}=require(state.stage+'/lib/supplier-transfer-review.ts');
 const {rehearseSupplierCatalogTransfer}=require(state.stage+'/tests/integration/catalog-launch.cjs');
 const client=new(require(state.stage+'/tests/integration/node_modules/pg').Client)({connectionString:state.env.PROSTORE_TEST_DATABASE_URL});
 try{
  // Deliberate synthetic hierarchy conflict: exercise the same structural correction
  // as the uploaded test catalog without copying any of its rows or private owners.
  const wrongCategory=await prisma.category.create({data:{name_en:'Synthetic legacy category',name_sw:'Synthetic legacy category'}});
  await prisma.product.update({where:{id:state.fixture.product},data:{categoryId:wrongCategory.id}});
  await client.connect();const results=await client.query(fs.readFileSync(path.join(state.stage,'scripts/supplier-catalog-export.sql'),'utf8'));const snapshot=results.find(r=>r.rows?.[0]?.supplier_catalog_snapshot).rows[0].supplier_catalog_snapshot;
  const original=JSON.stringify(snapshot);
  const draft=draftSupplierTransferReview(snapshot);
  assert.equal(draft.categoryCorrections.length,1);
  assert.throws(()=>prepareSupplierCatalogTransfer(snapshot,draft));
  // Approval here applies ONLY to this generated fixture and its disposable users.
  const review={...draft,completenessReviewed:true,
   accounts:draft.accounts.map(a=>({...a,targetUserId:a.sourceUserId,ownershipReviewed:true})),
   categoryCorrections:draft.categoryCorrections.map(c=>({...c,reviewed:true})),
   stock:draft.stock.map(s=>({...s,openingStock:s.kind==='product'?30:2,stockReviewed:true}))};
  const {input}=prepareSupplierCatalogTransfer(snapshot,review);
  await prisma.productPricing.deleteMany();await prisma.productVariant.deleteMany();await prisma.product.deleteMany();await prisma.subcategory.deleteMany();await prisma.category.deleteMany();await prisma.brand.deleteMany();await prisma.supplier.deleteMany();
  await prisma.user.update({where:{id:state.fixture.vendor},data:{phoneVerified:new Date()}});
  await rehearseSupplierCatalogTransfer(input);
  assert.equal(JSON.stringify(snapshot),original);
  const restored=await prisma.product.findUnique({where:{id:state.fixture.product},include:{subcategory:true}});
  assert.equal(restored.categoryId,restored.subcategory.categoryId);
  assert.equal(restored.stock,30);
  assert.equal(restored.supplierId,state.fixture.supplier);
  state.fixture.transferred=true;fs.writeFileSync(process.env.PROSTORE_BROWSER_STATE,JSON.stringify(state));
  console.log('PASS synthetic corrected catalog imported; snapshot unchanged; simulated stock and seller binding checked; pending approval');
 }finally{await client.end();await prisma.$disconnect();}
})().catch(e=>{console.error('Synthetic transfer seed failed',e.name,e.code,JSON.stringify(e.issues?.map(i=>({path:i.path,code:i.code}))));process.exitCode=1});
