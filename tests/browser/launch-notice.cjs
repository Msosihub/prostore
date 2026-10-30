const fs=require('fs'),assert=require('assert/strict');const {chromium}=require('playwright');
const state=JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));
(async()=>{const browser=await chromium.launch({executablePath:process.env.PROSTORE_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const context=await browser.newContext({viewport:{width:375,height:812}});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();
 await page.goto(state.baseUrl+'/product/test-item');await page.getByRole('heading',{name:'Test Item',exact:true}).waitFor();
 const notice=page.getByRole('complementary',{name:'Operational records notice'});
 if(state.env.NEXT_PUBLIC_CATALOG_RELAUNCH==='true'){await notice.waitFor();assert.match(await notice.innerText(),/historical obligations have not been cancelled/);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:state.stage+'/new-book-notice-mobile.png',fullPage:true});await page.reload();await notice.waitFor();}else assert.equal(await notice.count(),0);
 console.log('PASS explicit new-book notice matches fixture configuration and preserves product page');
 }finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1});
