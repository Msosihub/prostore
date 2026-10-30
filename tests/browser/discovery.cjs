const fs = require('fs'), assert = require('assert/strict');
const { chromium } = require('playwright');
const state = JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));
Object.assign(process.env,state.env);
const { prisma } = require(state.stage+'/tests/integration/database.cjs');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.PROSTORE_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const ids=[];
 const hydrationErrors=[];
 let page;
 try {
  const original = await prisma.product.findUnique({where:{id:state.fixture.product}});
  const {id,createdAt,updatedAt,...template}=original;
  const context = await browser.newContext({viewport:{width:375,height:812}});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  page = await context.newPage();
  page.on('pageerror', e=>{console.log('Browser error',page.url(),e.message);if(/hydration|hydrating|#418|#425/i.test(e.message))hydrationErrors.push({url:page.url(),message:e.message});});
  await page.goto(state.baseUrl+'/search?q=missing-synthetic');
  const input=page.getByRole('textbox',{name:'Tafuta bidhaa',exact:true});
  await input.waitFor();
  assert.equal(await input.inputValue(),'missing-synthetic');
  await page.getByRole('link',{name:'Onyesha Zote'}).click();
  await page.waitForURL(url => url.pathname === '/search' && !url.searchParams.has('q'), {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('input[name=q]')?.value==='');
  await page.goBack();
  await page.waitForFunction(()=>document.querySelector('input[name=q]')?.value==='missing-synthetic');
  for(let i=0;i<85;i++) {
   const p=await prisma.product.create({data:{...template,name:`Browse fixture ${i}`,slug:`browse-fixture-${i}`}});
   ids.push(p.id);
  }
  // Category pagination must be server rendered and crawlable without JavaScript.
  const categoryResponse=await context.request.get(state.baseUrl+'/categories/'+original.categoryId+'?page=2');
  assert.equal(categoryResponse.status(),200);
  const categoryHtml=await categoryResponse.text();
  assert(categoryHtml.includes('Kurasa za kundi'));
  assert(categoryHtml.includes('/categories/'+original.categoryId+'?page=3'));
  assert(categoryHtml.includes('rel="canonical" href="'+(state.publicOrigin||state.baseUrl)+'/categories/'+original.categoryId+'?page=2"'));
  await input.fill('Browse fixture'); await page.getByRole('button',{name:'Tafuta',exact:true}).click();
  await page.getByRole('navigation',{name:'Kurasa za bidhaa'}).waitFor();
  await page.getByRole('link',{name:'Mbele',exact:true}).click();
  await page.waitForURL('**page=2');
  assert.equal(new URL(page.url()).searchParams.get('q'),'Browse fixture');
  assert.equal(await page.getByRole('link',{name:'Ukurasa 2',exact:true}).getAttribute('aria-current'),'page');
  await page.getByRole('link',{name:'Mbele',exact:true}).click(); await page.waitForURL('**page=3');
  await page.getByRole('link',{name:'Mbele',exact:true}).click(); await page.waitForURL('**page=4');
  await page.getByRole('navigation',{name:'Kurasa za bidhaa'}).scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:state.stage+'/pagination-mobile-after.png'});
  await page.goto(state.baseUrl+'/search?category=NoSuchSyntheticCategory');
  await page.getByRole('status').filter({hasText:'Hatukupata bidhaa'}).waitFor();
  await page.screenshot({path:state.stage+'/empty-category-mobile-after.png'});
  for(const value of ['1.5','Infinity','-1']) {
   await page.goto(state.baseUrl+'/search?q=Test&page='+value+'&price=broken&rating=NaN');
   await page.getByText('Test Item',{exact:true}).first().waitFor();
  }
  await page.goto(state.baseUrl+'/search?q=Test&q=other&category=all&category=other');
  await page.getByText('Test Item',{exact:true}).first().waitFor();
  await input.fill('  Test Item  ');
  await page.getByRole('button',{name:'Tafuta',exact:true}).click();
  await page.getByText('Test Item',{exact:true}).first().waitFor();
  await page.setViewportSize({width:1280,height:900});
  await page.goto(state.baseUrl+'/search?q=Browse');
  await page.getByRole('navigation',{name:'Kurasa za bidhaa'}).waitFor();
  await page.screenshot({path:state.stage+'/search-desktop-after.png'});
  assert.deepEqual(hydrationErrors,[], 'Discovery must hydrate without recoverable mismatches');
  console.log('PASS search empty recovery, URL/back synchronization, accessible submit, mobile pagination/filter preservation and malformed URL recovery');
 } catch(error) {
  if(page) { console.log("Failure URL",page.url()); await page.screenshot({path:state.stage+"/discovery-failure.png"}); }
  throw error;
 } finally {
  await browser.close();
  await prisma.product.deleteMany({where:{id:{in:ids}}});
  await prisma.$disconnect();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
