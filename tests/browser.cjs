const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync,mkdirSync,existsSync,writeFileSync,cpSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dir=mkdtempSync(join(tmpdir(),'econova-browser-'));
 const exported=join(dir,'econova-main (1)','econova-main');mkdirSync(exported,{recursive:true});
 for(const name of ['server.js','lib','public','legacy'])cpSync(join(__dirname,'..',name),join(exported,name),{recursive:true});
 assert.equal(existsSync(join(exported,'node_modules')),false);
 const {createApp}=require(join(exported,'server.js'));
 const app=createApp({dbPath:join(dir,'e2e.sqlite')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+app.server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox']});
 const errors=[],logs=[];mkdirSync('test-results',{recursive:true});
 try{
  const contexts=await Promise.all([browser.newContext({viewport:{width:1440,height:960}}),browser.newContext({viewport:{width:1280,height:900}}),browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})]);
  const pages=await Promise.all(contexts.map(c=>c.newPage()));const[a,b,c]=pages;
  for(const page of pages){page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')logs.push(m.text());});}
  async function login(page,user){await page.goto(url);await page.locator('#loginModal').waitFor({state:'visible'});await page.locator('#loginUser').selectOption(user);await page.locator('#loginForm button').click();await page.locator('#loginModal').waitFor({state:'hidden'});}
  async function snapshot(page){return (await page.request.get(url+'/api/state')).json();}
  async function waitState(page,predicate,message){for(let i=0;i<80;i++){const s=await snapshot(page);if(predicate(s))return s;await delay(75);}throw Error('Timed out: '+message);}
  async function clickAction(page,action){console.log('Action:',action);await page.locator(`[data-action="${action}"]`).click();await page.waitForFunction(()=>!document.querySelector('[data-action][disabled]'));}
  await login(a,'aziza');await login(b,'bekzod');await login(c,'camila');
  await a.waitForFunction(()=>window.econovaSceneDiagnostics?.().geometries>20);
  await a.screenshot({path:'test-results/street-front.png'});const initialCamera=await a.evaluate(()=>window.econovaSceneDiagnostics().camera);await a.locator('#rotate').click();await delay(300);const rotated=await a.evaluate(()=>window.econovaSceneDiagnostics().camera);assert.notDeepEqual(rotated,initialCamera);await a.screenshot({path:'test-results/street-back.png'});await a.locator('#homeCamera').click();
  await a.locator('#scene canvas').click({position:{x:710,y:440}});await a.locator('#foundingForm').waitFor({state:'visible'});await a.locator('#foundingForm button').click();await waitState(a,s=>s.proposal?.accepted.includes('aziza'),'proposal created');
  await b.locator('[data-tab="company"]').click();await b.locator('[data-action="acceptFounding"]').waitFor();await clickAction(b,'acceptFounding');await waitState(a,s=>s.privateCompany?.treasury===10000000,'both owners share 10m');
  await a.locator('[data-action="lease"]').waitFor();await clickAction(a,'lease');await a.locator('[data-action="equipment"]').waitFor();await clickAction(a,'equipment');
  for(let i=0;i<3;i++){await a.locator('[data-action="hire"]').first().click();await waitState(a,s=>s.privateCompany.staff.length===i+1,'staff '+i);await a.waitForFunction(()=>!document.querySelector('[data-action][disabled]'));}
  await a.locator('[data-open="supplies"]').click();await a.locator('#partsForm button').click();await waitState(a,s=>s.privateCompany.stock===6,'parts purchased');await a.locator('[data-open="company"]').click();await clickAction(a,'startScenario');await waitState(b,s=>s.privateCompany.bookings.length===6,'bookings shared');
  console.log('Opening decision panel');await a.locator('[data-section="decision"]').first().click();await a.locator('[data-action="rentLift"]').waitFor();await clickAction(a,'rentLift');await waitState(b,s=>s.privateCompany.temporary,'temporary lift shared');await clickAction(a,'practiceSettle');
  const report=await waitState(a,s=>s.privateCompany.report?.completed===6,'six jobs completed');assert.equal(report.privateCompany.report.profit,150000);assert.equal(report.privateCompany.treasury,9400000);
  await a.locator('[data-section="report"]').first().click();await a.screenshot({path:'test-results/workshop-report.png'});
  await a.locator('[data-section="sale"]').click();await a.locator('#saleForm button').click();await waitState(b,s=>s.listing?.price===12000000,'sale published');await b.locator('[data-section="sale"]').click();await clickAction(b,'approveSale');
  await c.locator('[data-tab="market"]').click();await c.locator('[data-action="acquire"]').waitFor();await c.screenshot({path:'test-results/mobile-sale.png'});const before=await snapshot(c);await clickAction(c,'acquire');await waitState(c,s=>s.privateCompany?.owners[0].id==='camila','acquisition closed');
  const sellerA=await snapshot(a),sellerB=await snapshot(b),buyer=await snapshot(c);assert.equal(sellerA.me.wallet,16200000);assert.equal(sellerB.me.wallet,15800000);assert.equal(buyer.me.wallet,3000000);assert.equal(buyer.privateCompany.treasury,9400000);assert.equal(sellerA.privateCompany,null);assert.equal(buyer.privateCompany.id,before.company.id);
  await c.reload();await c.locator('#wallet').waitFor();await waitState(c,s=>s.me.id==='camila'&&s.privateCompany?.owners[0].id==='camila','session survives reload');await c.locator('[data-tab="company"]').click();await c.screenshot({path:'test-results/mobile-company.png'});
  const cameraBefore=await c.evaluate(()=>window.econovaSceneDiagnostics().camera);await c.locator('#panelContent').evaluate(el=>el.scrollTop=el.scrollHeight);const cameraAfter=await c.evaluate(()=>window.econovaSceneDiagnostics().camera);assert.deepEqual(cameraAfter,cameraBefore);assert.equal(await c.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await c.locator('#closePanel').click();await c.locator('#settingsButton').click();await c.locator('#lowGraphics').check();await c.locator('#reduceMotion').check();await c.locator('[data-open="locations"]').click();await c.locator('[data-open="company"]').click();assert.ok(await c.locator('#panelTitle').textContent());
  await c.locator('[data-tab="lab"]').click();await c.locator('#labForm [name="prediction"]').fill('120000');await c.locator('#labForm button').click();assert.match(await c.locator('#labResult').textContent(),/Aniq hisob/);assert.equal((await snapshot(c)).me.wallet,3000000);
  await c.locator('#closePanel').click();await c.screenshot({path:'test-results/mobile-street.png'});
  const fallbackContext=await browser.newContext({viewport:{width:390,height:844}});
  await fallbackContext.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.startsWith('webgl'))return null;return original.call(this,type,...args);};});
  const fallback=await fallbackContext.newPage();await login(fallback,'camila');assert.equal(await fallback.locator('#sceneFailure').isVisible(),true);await fallback.locator('#locations').click();await fallback.locator('[data-open="company"]').click();assert.match(await fallback.locator('#panelTitle').textContent(),/Navro‘z/);await fallbackContext.close();
  assert.deepEqual(errors,[]);const diagnostics=await a.evaluate(()=>window.econovaSceneDiagnostics());
  writeFileSync('test-results/browser-report.json',JSON.stringify({passed:true,checked:['clean export without node_modules or npm installation','three independent authenticated sessions','shared founding and workshop changes','6 completed jobs and exact profit','two seller signatures','12m sale with 7.2m/4.8m payouts','old owner permissions removed','session and ownership survive reload','180-degree geometry view','3D building picking','no-WebGL location list','390px mobile overflow','panel scrolling preserves camera','low graphics and reduced motion','lab isolation'],diagnostics,browser:await browser.version(),pageErrors:errors,console:logs},null,2));
  console.log('PASS: clean exported app, three-session P0 flow, six jobs, exact payouts, ownership, reload, geometry rotation, mobile, low graphics, laboratory.');console.log(JSON.stringify(diagnostics));
 }catch(e){for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:'test-results/failure-'+browser.contexts().indexOf(context)+'.png'}).catch(()=>{});}console.error('Browser errors:',errors);console.error('Console:',logs.slice(-12));throw e;}
 finally{await browser.close();await app.close();rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
