const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('playwright');
const state=JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));Object.assign(process.env,state.env);
const {prisma}=require(state.stage+'/tests/integration/database.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PROSTORE_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({storageState:state.stage+'/buyer-session.json',viewport:{width:375,height:812}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const user=await prisma.user.findUniqueOrThrow({where:{id:state.fixture.buyer}});
 try{
  const source=await prisma.order.findFirstOrThrow({where:{isPaid:true},include:{orderitems:true}});
  const {id,createdAt,orderitems,...orderData}=source;
  const order=await prisma.order.create({data:{...orderData,isDelivered:false,deliveredAt:null,orderitems:{create:orderitems.map(({orderId,...i})=>({...i,isDelivered:false,deliveredAt:null}))}}});
  const before=await prisma.order.findUnique({where:{id:order.id},include:{orderitems:true}});
  const ledgerBefore=await prisma.supplierLedger.count();
  await prisma.user.update({where:{id:user.id},data:{role:'ADMIN'}});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  await page.goto(state.baseUrl+'/admin/payments/legacy');
  await page.getByRole('heading',{name:'Legacy escrow review',exact:true}).waitFor();
  await page.getByRole('link',{name:'Review order '+order.id,exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/approve|release|replay|clear/i}).count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:state.stage+'/legacy-review-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await page.screenshot({path:state.stage+'/legacy-review-desktop.png',fullPage:true});
  await page.reload();await page.getByRole('link',{name:'Review order '+order.id,exact:true}).waitFor();
  assert.deepEqual(await prisma.order.findUnique({where:{id:order.id},include:{orderitems:true}}),before);
  assert.equal(await prisma.supplierLedger.count(),ledgerBefore);
  await prisma.user.update({where:{id:user.id},data:{role:'BUYER'}});
  await page.goto(state.baseUrl+'/admin/payments/legacy');
  await page.waitForURL(url=>url.pathname==='/unauthorized');
  console.log('PASS legacy review mobile/desktop, read-only reload, revoked admin blocked');
 }finally{await prisma.user.update({where:{id:user.id},data:{role:user.role}});await context.close();await browser.close();await prisma.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
