const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('playwright');
const state=JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));Object.assign(process.env,state.env);
const {prisma}=require(state.stage+'/tests/integration/database.cjs');
(async()=>{
 const original=await prisma.product.findUnique({where:{id:state.fixture.product}});const demoIds=[];
 const browser=await chromium.launch({executablePath:process.env.PROSTORE_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const {id,createdAt,...template}=original;
 for(let i=0;i<25;i++){const row=await prisma.product.create({data:{...template,name:'DEMO product '+i,slug:'demo-product-'+i,images:['/images/sample-products/p'+(i%6+1)+'-1.jpg'],isFeatured:i<4}});demoIds.push(row.id);}

 for (const slug of ['pioneer-6"-x-9"-speaker', 'discount-50%', 'literal-%22', 'pioneer-6%22-x-9%22-speaker', 'spika-音楽', 'slash%2Fkept']) {
   const row=await prisma.product.create({data:{...template,name:'Slug fixture '+slug,slug}});demoIds.push(row.id);
   await page.goto(state.baseUrl+'/product/'+encodeURIComponent(slug));
   await page.getByRole('heading',{name:row.name,exact:true}).waitFor();
   assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),state.baseUrl+'/product/'+encodeURIComponent(slug));
   const markup=await page.locator('script[type="application/ld+json"]').evaluateAll(ns=>ns.map(n=>JSON.parse(n.textContent)).find(x=>x['@type']==='Product'));
   assert.equal(markup.name,row.name);assert.equal(markup.url,state.baseUrl+'/product/'+encodeURIComponent(slug));
 }
 await page.goto(state.baseUrl+'/');await page.getByRole('heading',{name:'Mpya sokoni',exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('h1').length===1);assert.equal(await page.getByRole('heading',{level:1}).count(),1);await page.screenshot({path:state.stage+'/storefront-only-desktop.png',fullPage:true});
 await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:state.stage+'/storefront-only-mobile.png',fullPage:true});
 const product=await prisma.product.findUnique({where:{id:state.fixture.product}});
 await page.goto(state.baseUrl+'/categories/'+product.categoryId);await page.getByRole('navigation',{name:'Kurasa za kundi',exact:true}).waitFor();
 const second=await context.request.get(state.baseUrl+'/categories/'+product.categoryId+'?page=2');assert.equal(second.status(),200);const html=await second.text();assert(html.includes('Kurasa za kundi'));assert(html.includes('rel="canonical" href="'+state.baseUrl+'/categories/'+product.categoryId+'?page=2"'));
 await prisma.product.deleteMany({where:{id:{in:demoIds}}});
 await prisma.product.update({where:{id:product.id},data:{price:0}});await page.goto(state.baseUrl+'/');await page.getByText('Hakuna bidhaa za kuonyesha kwa sasa.',{exact:true}).waitFor();await prisma.product.update({where:{id:product.id},data:{price:product.price}});
 await page.goto(state.baseUrl+'/search?q=Test');await page.getByRole('link',{name:'Test Item',exact:true}).waitFor();
 assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
 await page.goto(state.baseUrl+'/product/test-item');
 assert.match(await page.locator('link[rel="canonical"]').getAttribute('href'),/\/product\/test-item$/);
 const schema=await page.locator('script[type="application/ld+json"]').evaluateAll(ns=>ns.map(n=>JSON.parse(n.textContent)).find(x=>x['@type']==='Product'));
 assert.equal(schema.offers.availability,'https://schema.org/InStock');
 assert.match(await (await context.request.get(state.baseUrl+'/sitemap.xml')).text(),/sitemapindex/);
 assert.match(await (await context.request.get(state.baseUrl+'/sitemaps/products/1.xml')).text(),/product\/test-item/);
 assert.match(await (await context.request.get(state.baseUrl+'/robots.txt')).text(),/Disallow: \//);
 // Synthetic session avoids exercising or changing the baseline OTP delivery flow.
 const {encode}=await import('next-auth/jwt');
 const cookie='authjs.session-token';const token=await encode({secret:state.env.AUTH_SECRET,salt:cookie,token:{sub:state.fixture.buyer,name:'Synthetic Buyer',role:'BUYER',onboarded:true,phone:'+255700000000'}});
 await context.addCookies([{name:cookie,value:token,url:state.baseUrl,httpOnly:true,sameSite:'Lax'}]);
 await prisma.user.update({where:{id:state.fixture.buyer},data:{paymentPhone:'+255700000000'}});
 await page.goto(state.baseUrl+'/product/test-item');await page.getByRole('button',{name:'Weka Kikapuni',exact:true}).click();
 await page.waitForTimeout(500);await page.goto(state.baseUrl+'/cart');await page.getByText('Test Item',{exact:true}).filter({visible:true}).first().waitFor();
 const cart=await prisma.cart.findFirst({where:{userId:state.fixture.buyer}});assert(cart);assert.equal(cart.items.length,1);assert.equal(cart.items[0].qty,1);
 await page.goto(state.baseUrl+'/place-order');await page.getByRole('heading',{name:'Weka Agizo',exact:true}).waitFor();
 const responsePromise=page.waitForResponse(r=>r.url().includes('/api/zenopay/create-payment')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Agiza Sasa',exact:true}).click();const response=await responsePromise;assert.equal(response.status(),200);
 const order=await prisma.order.findFirst({where:{userId:state.fixture.buyer},include:{orderitems:true}});assert(order);assert.equal(order.isPaid,false);assert.equal(order.orderitems.length,1);assert.equal(Number(order.totalPrice),Number(cart.totalPrice));
 const payments=JSON.parse(fs.readFileSync(state.stage+'/payments.json'));assert.equal(payments.collections,1);assert.equal((await prisma.product.findUnique({where:{id:product.id}})).stock,product.stock);
 console.log('PASS main-compatible storefront/category/search/SEO/mobile and unchanged cart → order → one mocked pending payment; no callback or real call');
 } finally {await browser.close();await prisma.product.deleteMany({where:{id:{in:demoIds}}});await prisma.product.update({where:{id:original.id},data:{price:original.price}});await prisma.$disconnect()}
})().catch(e=>{console.error(e);process.exitCode=1});
