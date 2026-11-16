const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,mkdirSync,cpSync,readFileSync,existsSync,rmSync}=require('node:fs');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const {createHash}=require('node:crypto');

test('extracted project serves the game and verified 3D modules without node_modules or npm',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'econova-launch-'));
 const exported=join(dir,'econova-main (1)','econova-main');mkdirSync(exported,{recursive:true});
 for(const name of ['server.js','lib','public','legacy'])cpSync(join(__dirname,'..',name),join(exported,name),{recursive:true});
 assert.equal(existsSync(join(exported,'node_modules')),false);
 assert.equal(existsSync(join(exported,'package-lock.json')),false);
 const {createApp}=require(join(exported,'server.js'));
 const app=createApp({dbPath:join(dir,'data','game.sqlite')});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true});});
 const url='http://127.0.0.1:'+app.server.address().port;
 assert.equal((await fetch(url+'/api/health')).status,200);
 assert.match(await (await fetch(url)).text(),/Navro‘z ko‘chasi/);
 const manifest=JSON.parse(readFileSync(join(exported,'public/vendor/manifest.json')));
 for(const name of ['three.module.js','three.core.js','OrbitControls.js','BufferGeometryUtils.js']){
  const response=await fetch(url+'/vendor/'+name);assert.equal(response.status,200,name);
  const actual=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  assert.equal(actual,manifest.files[name],name+' checksum');
 }
 const login=await fetch(url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:'aziza',password:'econova-demo'})});
 assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 const state=await (await fetch(url+'/api/state',{headers:{cookie}})).json();
 assert.equal(state.me.wallet,15000000);
 assert.equal((await fetch(url+'/legacy/')).status,200);
 assert.equal((await fetch(url+'/lib/store.js')).status,404);
});
