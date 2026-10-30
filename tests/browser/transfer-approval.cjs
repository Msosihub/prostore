const fs=require('fs'),assert=require('assert/strict');const {chromium}=require('playwright');
const state=JSON.parse(fs.readFileSync(process.env.PROSTORE_BROWSER_STATE));Object.assign(process.env,state.env);
const {prisma}=require(state.stage+'/tests/integration/database.cjs');
(async()=>{
 assert(state.fixture.transferred,'Transfer fixture required');
 const browser=await chromium.launch({executablePath:process.env.PROSTORE_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:375,height:812}});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const user=await prisma.user.create({data:{name:'Synthetic transfer admin',phone:'+255700000099',role:'ADMIN'}});
 try{
  const page=await context.newPage();page.setDefaultTimeout(60000);page.on('dialog',d=>d.accept());
  await page.goto(state.baseUrl+'/company/'+state.fixture.supplier+'/home');assert(await page.locator('meta[name="robots"][content*="noindex"]').count());await page.getByRole('heading',{name:'Haujapatikana',exact:true}).waitFor();assert.equal(await page.getByRole('heading',{name:'Test Supplier',exact:true}).count(),0);assert.equal(await page.getByRole('link',{name:'Test Item',exact:true}).count(),0);
  await page.goto(state.baseUrl+'/sign-in?callbackUrl=/admin/seller-applications');await page.locator('#identifier').fill(user.phone);await page.getByRole('button',{name:'Tuma Msimbo wa OTP'}).click();await page.locator('#otp').waitFor();const otp=await prisma.verificationToken.findFirst({where:{identifier:user.phone}});await page.locator('#otp').fill(otp.token);await page.getByRole('button',{name:'Thibitisha na Uingie Sokoni'}).click();await page.waitForURL(u=>u.pathname==='/admin/seller-applications');
  await page.locator('textarea[name="reason"]').fill('Synthetic transferred seller identity reviewed');await page.getByRole('button',{name:'Record review',exact:true}).click();
  for(let i=0;i<60;i++){const row=await prisma.sellerRegistration.findUnique({where:{supplierId:state.fixture.supplier}});if(row.state==='APPROVED')break;if(i===59)throw Error('Approval not persisted');await new Promise(r=>setTimeout(r,250));}
  assert.equal((await prisma.sellerNotice.findFirst()).state,'SUPPRESSED');
  await page.goto(state.baseUrl+'/company/'+state.fixture.supplier+'/home');await page.getByRole('heading',{name:'Test Supplier',exact:true}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.getByRole('complementary',{name:'Synthetic demo notice'}).waitFor();await page.screenshot({path:state.stage+'/transferred-shop-mobile.png',fullPage:true});
  await page.goto(state.baseUrl+'/');await page.getByRole('complementary',{name:'Synthetic demo notice'}).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:state.stage+'/synthetic-home-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:state.stage+'/synthetic-home-desktop.png',fullPage:true});
  console.log('PASS transferred shop hidden before review; admin UI approval; original shop URL visible; notifications suppressed');
 }finally{await context.close();await browser.close();await prisma.$disconnect();}
})().catch(e=>{console.error(e.message);process.exitCode=1});
