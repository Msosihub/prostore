const fs = require('fs'), assert = require('assert/strict');
const { chromium } = require('playwright');
const state = JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));
Object.assign(process.env,state.env);
const { prisma } = require(state.stage+'/tests/integration/database.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PROSTORE_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const original=await prisma.product.findUnique({where:{id:state.fixture.product}});
 const reviews=[];
 try {
  const context=await browser.newContext({viewport:{width:375,height:812}});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const page=await context.newPage();
  await page.goto(state.baseUrl+'/product/test-item');
  await page.getByRole('main').getByText('Bado hakuna maoni',{exact:true}).waitFor();
  await page.screenshot({path:state.stage+'/reviews-empty-mobile.png'});
  // Synthetic review rows, then the same avg/count projection used by review writes.
  for(const rating of [3,4]) {
   const row=await prisma.review.create({data:{productId:original.id,userId:state.fixture.buyer,rating,title:'Synthetic review',description:'Disposable fixture only',isVerifiedPurchase:false}});
   reviews.push(row.id);
  }
  const average=await prisma.review.aggregate({where:{productId:original.id},_avg:{rating:true}});
  const count=await prisma.review.count({where:{productId:original.id}});
  await prisma.product.update({where:{id:original.id},data:{rating:average._avg.rating,numReviews:count,stock:3}});
  await page.reload();
  await page.getByRole('main').getByRole('img',{name:'Maoni 2: 3.5 kati ya 5',exact:true}).waitFor();
  await page.screenshot({path:state.stage+'/reviews-real-mobile.png'});
  await page.goto(state.baseUrl+'/search?q=Test');
  for(let i=0;i<3;i++) {
   if(i) await page.reload();
   await page.getByText('Test Item',{exact:true}).first().waitFor();
   await page.getByText('Zipo 3 dukani',{exact:true}).waitFor();
   const text=await page.locator('main').innerText();
   assert(!text.includes('zimeuzika')); assert(!text.includes('(12)'));
   assert.equal(await page.locator('main svg.text-yellow-500').count(),0);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:state.stage+'/catalog-claims-mobile.png'});
  console.log('PASS database-backed empty/real review summaries; deterministic low inventory and no fabricated card reviews/sales across reloads');
 } catch (error) {
  for (const c of browser.contexts()) for (const p of c.pages()) await p.screenshot({path:state.stage+"/credibility-failure.png"}).catch(()=>{});
  throw error;
 } finally {
  await browser.close();
  await prisma.review.deleteMany({where:{id:{in:reviews}}});
  await prisma.product.update({where:{id:original.id},data:{stock:original.stock,rating:original.rating,numReviews:original.numReviews}});
  await prisma.$disconnect();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
