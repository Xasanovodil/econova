const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {Store, GameError, check} = require('./lib/store');
const {Game} = require('./lib/game');

function createApp({dbPath=process.env.ECONOVA_DB || path.join(__dirname,'data','econova.sqlite'),period,now}={}) {
  const store=new Store(dbPath);store.seed();const game=new Game(store,{period,now});
  const clients=new Set(), attempts=new Map();
  const broadcast=()=>{for(const res of clients)res.write('event: changed\ndata: {}\n\n');};
  const timer=setInterval(()=>{try{if(game.due())broadcast();}catch(e){console.error('Settlement failed:',e.message);}},1000);timer.unref();
  const heartbeat=setInterval(()=>{for(const res of clients)res.write(': keepalive\n\n');},20000);heartbeat.unref();
  const tokenOf=req=>{const match=(req.headers.cookie||'').match(/(?:^|; )econova_session=([^;]+)/);return match?.[1]||'';};
  const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  async function body(req){
    check(req.headers['content-type']?.startsWith('application/json'),'JSON so‘rov yuboring.',415);
    let data='';for await(const chunk of req){data+=chunk;check(Buffer.byteLength(data)<=16384,'So‘rov juda katta.',413);}
    try{return JSON.parse(data);}catch{throw new GameError('JSON noto‘g‘ri.',400);}
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'");
    try{
      const url=new URL(req.url,'http://localhost');
      if(req.method==='POST'){
        if(req.headers.origin)check(req.headers.origin===`http://${req.headers.host}`||req.headers.origin===`https://${req.headers.host}`,'Boshqa saytdan so‘rov rad etildi.',403);
        check(req.headers['sec-fetch-site']!=='cross-site','Boshqa saytdan so‘rov rad etildi.',403);
      }
      if(url.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
      if(url.pathname==='/api/health'){return json(res,200,{ok:true,mode:'local-practice',rulesVersion:1});}
      if(url.pathname==='/api/login'&&req.method==='POST'){
        const ip=req.socket.remoteAddress,record=attempts.get(ip)||{count:0,until:Date.now()+60000};
        if(record.until<Date.now()){record.count=0;record.until=Date.now()+60000;}record.count++;attempts.set(ip,record);check(record.count<=30,'Bir daqiqadan keyin qayta urinib ko‘ring.',429);
        const p=await body(req);check(typeof p.user==='string'&&typeof p.password==='string'&&p.password.length<=128,'Kirish ma’lumotlari noto‘g‘ri.');
        const token=store.login(p.user,p.password);
        res.setHeader('Set-Cookie',`econova_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`);
        return json(res,200,{ok:true});
      }
      if(url.pathname.startsWith('/api/')){
        const actor=store.authenticate(tokenOf(req));
        if(url.pathname==='/api/state'&&req.method==='GET'){return json(res,200,game.view(actor));}
        if(url.pathname==='/api/logout'&&req.method==='POST'){store.logout(tokenOf(req));res.setHeader('Set-Cookie','econova_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
        if(url.pathname==='/api/command'&&req.method==='POST'){const result=game.command(actor,await body(req));broadcast();return json(res,200,result);}
        if(url.pathname==='/api/events'&&req.method==='GET'){
          res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write('event: changed\ndata: {}\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;
        }
        return json(res,404,{error:'API topilmadi.'});
      }
      check(req.method==='GET'||req.method==='HEAD','Usul ruxsat etilmagan.',405);
      const routes={
        '/':'public/index.html','/index.html':'public/index.html',
        '/app.js':'public/app.js','/style.css':'public/style.css','/city.js':'public/city.js',
        '/vendor/three.module.js':'public/vendor/three.module.js',
        '/vendor/three.core.js':'public/vendor/three.core.js',
        '/vendor/OrbitControls.js':'public/vendor/OrbitControls.js',
        '/vendor/BufferGeometryUtils.js':'public/vendor/BufferGeometryUtils.js',
        '/legacy/':'legacy/index.html','/legacy/index.html':'legacy/index.html',
        '/legacy/app.js':'legacy/app.js','/legacy/style.css':'legacy/style.css','/legacy/economy.js':'legacy/economy.js'
      };
      const file=routes[url.pathname];if(!file){res.writeHead(404);return res.end('Topilmadi');}
      const ext=path.extname(file);res.setHeader('Content-Type',{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[ext]);
      res.setHeader('Cache-Control','no-cache');const data=await fs.promises.readFile(path.join(__dirname,file));res.end(req.method==='HEAD'?undefined:data);
    }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Serverda xato. Qayta urinib ko‘ring.'});else res.end();if(!e.status)console.error(e);}
  });
  function close(){clearInterval(timer);clearInterval(heartbeat);for(const r of clients)r.end();return new Promise(resolve=>server.close(()=>{store.close();resolve();}));}
  return {server,store,game,close,broadcast};
}
if(require.main===module){
  const app=createApp();const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
  app.server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} band. Boshqa Econova oynasini yoping yoki PORT ni o‘zgartiring.`:e.message);process.exitCode=1;});
  app.server.listen(port,host,()=>{
    const url=`http://localhost:${port}`;
    console.log(`\nEconova P0 ishlayapti: ${url}\nMahalliy mashq shahri · 3 ta sinov hisobi\nTo‘xtatish: Ctrl+C\n`);
    if(process.argv.includes('--open')){
      if(process.platform==='win32')execFile('cmd.exe',['/c','start','',url]);
      else if(process.platform==='darwin')execFile('open',[url]);
      else execFile('xdg-open',[url],()=>{});
    }
  });
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
}
module.exports={createApp};
