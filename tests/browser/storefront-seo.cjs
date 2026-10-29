const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('playwright');
const state=JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));
Object.assign(process.env,state.env);
const {prisma}=require(state.stage+'/tests/integration/database.cjs');
(async()=>{
 const original=await prisma.product.findUnique({where:{id:state.fixture.product}});
 const demoIds=[];
 const browser=await chromium.launch({executablePath:process.env.PROSTORE_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const page=await context.newPage();
 for(let i=1;i<=6;i++) {
 const row=await prisma.product.create({data:{name:'DEMO · Shati '+i,slug:'demo-storefront-'+i,description:'Synthetic visual QA fixture only',tags:[],price:15000+i*1000,stock:20,images:[i===6?'/images/demo-missing.jpg':'/images/sample-products/p'+i+'-1.jpg'],isFeatured:i<=4,supplierId:original.supplierId,categoryId:original.categoryId,subcategoryId:original.subcategoryId,brandId:original.brandId}});demoIds.push(row.id);
 }

 const response=await page.goto(state.baseUrl+'/');
 assert.equal(response.status(),200);assert.match(response.headers()['x-robots-tag'],/noindex/);
 await page.getByRole('heading',{level:1,name:/Pata kinachokufaa/}).waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('h1').length===1,{},{timeout:10000});
 assert.equal(await page.locator('h1').count(),1);
 await page.getByRole('heading',{name:'Mpya sokoni',exact:true}).waitFor();
 await page.locator('article').filter({hasText:'DEMO · Shati 6'}).getByText('Picha haipatikani',{exact:true}).waitFor();
 assert.equal(await page.getByRole('link',{name:'Anza kuwa muuzaji',exact:true}).getAttribute('href'),'/sell');
 await page.getByRole('navigation',{name:'Endelea na ununuzi'}).waitFor();
 const question=page.locator('summary').filter({hasText:'Malipo yakisubiri nifanye nini?'});
 await question.focus();await page.keyboard.press('Enter');
 assert.equal(await question.evaluate(n=>n.parentElement.open),true);
 await page.getByText('Usianzishe malipo mapya',{exact:false}).waitFor();
 await page.screenshot({path:state.stage+'/storefront-desktop.png' ,fullPage:true});
 console.log('LOCAL synthetic homepage navigation:',JSON.stringify(await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {ttfbMs:Math.round(n.responseStart-n.requestStart),domContentLoadedMs:Math.round(n.domContentLoadedEventEnd),transferBytes:n.transferSize,resources:performance.getEntriesByType('resource').length}})));
 await page.setViewportSize({width:375,height:812});
 await page.screenshot({path:state.stage+'/storefront-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('link',{name:'Angalia makundi',exact:true}).click();
 await page.locator('h1').waitFor();
 await prisma.product.deleteMany({where:{id:{in:demoIds}}});
 await page.goto(state.baseUrl+'/product/test-item');
 const schema=await page.locator('script[type="application/ld+json"]').evaluateAll(nodes=>nodes.map(n=>JSON.parse(n.textContent)).find(x=>x['@type']==='Product'));
 assert.equal(schema.offers.availability,'https://schema.org/InStock');assert.equal(schema.offers.price,'1000.00');
 assert.match(await page.locator('link[rel="canonical"]').getAttribute('href'),/\/product\/test-item$/);
 await prisma.product.update({where:{id:original.id},data:{price:0}});
 await page.goto(state.baseUrl+'/');await page.locator('#storefront-content').getByText('Hakuna bidhaa za kuonyesha kwa sasa.',{exact:true}).waitFor();
 await page.screenshot({path:state.stage+'/storefront-empty-mobile.png',fullPage:true});
 await prisma.product.update({where:{id:original.id},data:{price:original.price}});
 const sitemap=await context.request.get(state.baseUrl+'/sitemap.xml');assert.equal(sitemap.status(),200);assert.match(await sitemap.text(),/sitemapindex/);
 const products=await context.request.get(state.baseUrl+'/sitemaps/products/1.xml');assert.match(await products.text(),/\/product\/test-item/);assert(! (await products.text()).includes('/admin'));
 const robots=await context.request.get(state.baseUrl+'/robots.txt');assert.match(await robots.text(),/Disallow: \//);
 const missing=await context.request.get(state.baseUrl+'/categories/not-a-uuid');
 // Next streaming can commit 200 before notFound; it must still render the missing page and noindex.
 assert([200,404].includes(missing.status()));const missingHtml=await missing.text();
 assert.match(missingHtml,/name="robots" content="noindex/);assert.match(missingHtml,/404|not found|halijapatikana/i);
 await page.goto(state.baseUrl+'/search?q=Test');assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(state.baseUrl+'/qa-loading',{waitUntil:'commit'});
 await page.getByRole('status').filter({hasText:'Tafadhali subiri'}).waitFor();
 await page.waitForFunction(()=>{const n=document.querySelector('[aria-label="Ukurasa unapakiwa"] .motion-reduce\\:animate-none');return n&&getComputedStyle(n).animationName==='none';});
 await page.screenshot({path:state.stage+'/loading-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Pakia tena',exact:true}).waitFor({timeout:16000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByText('DEMO loading complete',{exact:true}).waitFor({timeout:45000});
 console.log('PASS honest streamed loading, reduced motion, long-wait recovery and completion');
 console.log('PASS storefront mobile/desktop, real product schema, canonical, sitemap, demo robots, invalid-category missing/noindex and filtered-search noindex');
 } finally {await browser.close();await prisma.product.deleteMany({where:{id:{in:demoIds}}});await prisma.product.update({where:{id:original.id},data:{price:original.price}});await prisma.$disconnect()}
})().catch(e=>{console.error(e);process.exitCode=1});
