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
  await prisma.$executeRaw`INSERT INTO "UnmatchedPaymentNotice" ("id","provider","attemptReference","claimedStatus") VALUES ('synthetic-browser', 'ZENOPAY', 'synthetic_legacy_reference', 'COMPLETED')`;
  await prisma.user.update({where:{id:user.id},data:{role:'ADMIN'}});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  await page.goto(state.baseUrl+'/admin/payments');
  await page.getByRole('link',{name:'Unmatched callback evidence',exact:true}).click();
  await page.getByRole('heading',{name:'Unmatched callback evidence',exact:true}).waitFor();
  await page.getByRole('heading',{name:'synthetic_legacy_reference',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/approve|release|replay|clear|settle/i}).count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:state.stage+'/unmatched-notice-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:state.stage+'/unmatched-notice-desktop.png',fullPage:true});
  await page.reload();await page.getByRole('heading',{name:'synthetic_legacy_reference',exact:true}).waitFor();
  await prisma.user.update({where:{id:user.id},data:{role:'BUYER'}});
  await page.goto(state.baseUrl+'/admin/payments/unmatched');await page.waitForURL(url=>url.pathname==='/unauthorized');
  console.log('PASS unmatched notice read-only queue, mobile/desktop/reload and revoked admin');
 }finally{await prisma.user.update({where:{id:user.id},data:{role:user.role}});await context.close();await browser.close();await prisma.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
