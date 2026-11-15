const {randomUUID, createHash} = require('node:crypto');
const {check, money} = require('./store');
const PERIOD = 3 * 3600000;
const PART = 60000;
const LABOUR = 40000;
const STAFF = {manager:{name:'Saida',role:'Boshqaruvchi',wage:30000},mechanic1:{name:'Rustam',role:'Usta',wage:45000},mechanic2:{name:'Dilshod',role:'Usta',wage:45000}};
const names = ['Sardor','Nodira','Otabek','Shahnoza','Javohir','Malika'];
function owner(c, actor) { check(c && c.owners.some(o=>o.id===actor), 'Bu kompaniyani boshqarish huquqingiz yo‘q.', 403); }
function operational(c) { check(!c.listing || c.listing.status!=='open', 'Sotuv taklifi ochiq: avval uni bekor qiling.'); }
function event(s, text, kind='info') { s.events.unshift({id:randomUUID(), text,kind,at:Date.now()}); s.events=s.events.slice(0,40); }
function foundingTerms(p) { return {id:p.id,name:p.name,contributions:p.contributions,version:p.termsVersion,expires:p.expires}; }
class Game {
  constructor(store, {period=PERIOD, now=()=>Date.now()}={}) { this.store=store; this.period=period; this.now=now; }
  view(actor) {
    const s=this.store.state(), c=s.company, mine=c?.owners.some(o=>o.id===actor);
    const user=this.store.db.prepare('SELECT id,alias FROM users WHERE id=?').get(actor);
    const members=this.store.db.prepare('SELECT id,alias FROM users').all();
    const proposal=s.proposal && s.proposal.contributions.some(o=>o.id===actor) ? s.proposal : null;
    const publicCompany=c?{id:c.id,name:c.name,owners:c.owners.map(o=>({id:o.id,share:o.share})),leased:c.leased,staffCount:c.staff.length,lifts:c.lifts,temporary:c.temporary,price:c.price,reputation:c.reputation,completed:c.bookings.filter(b=>b.status==='completed').length,waiting:c.bookings.filter(b=>b.status==='waiting').length,bookings:c.bookings.map(b=>({id:b.id,status:b.status,bay:b.bay,completedAt:b.completedAt})),lastReport:c.report?{completed:c.report.completed,at:c.report.at}:null}:null;
    return {city:s.cityId,name:s.name,version:s.version,rulesVersion:s.rulesVersion,practice:true,serverTime:this.now(),tick:s.tick,nextSettlement:c?.nextSettlement||null,me:{...user,wallet:this.store.balance('wallet:'+actor),receipts:this.store.db.prepare('SELECT j.id,j.kind,j.memo,j.created,l.amount FROM journal j JOIN lines l ON j.id=l.entry_id WHERE l.account=? ORDER BY j.rowid DESC LIMIT 30').all('wallet:'+actor)},members,proposal,parcelReserved:!!s.proposal,company:publicCompany,privateCompany:mine?{...c,treasury:this.store.balance('company:'+c.id),receipts:this.store.receipts(c.id)}:null,listing:c?.listing?.status==='open'?c.listing:null,events:s.events};
  }
  command(actor, envelope) {
    check(envelope && typeof envelope.commandId==='string' && /^[\w-]{8,100}$/.test(envelope.commandId), 'Buyruq identifikatori noto‘g‘ri.');
    check(typeof envelope.action==='string' && envelope.payload && typeof envelope.payload==='object' && !Array.isArray(envelope.payload), 'Buyruq formati noto‘g‘ri.');
    const fingerprint=createHash('sha256').update(JSON.stringify({action:envelope.action,payload:envelope.payload})).digest('hex');
    return this.store.atomic(()=>{
      const prior=this.store.db.prepare('SELECT * FROM commands WHERE actor=? AND id=?').get(actor,envelope.commandId);
      if(prior){check(prior.fingerprint===fingerprint,'Bu buyruq raqami boshqa amal uchun ishlatilgan.',409);return JSON.parse(prior.result);}
      const s=this.store.state();
      check(envelope.expectedVersion===s.version,'Shahar holati yangilandi. Yangi ma’lumotni tekshirib, qayta urinib ko‘ring.',409);
      this.apply(s,actor,envelope.action,envelope.payload,envelope.commandId);
      s.version++;
      this.store.write(s);
      const result={ok:true,version:s.version,commandId:envelope.commandId};
      this.store.db.prepare('INSERT INTO commands VALUES(?,?,?,?)').run(actor,envelope.commandId,fingerprint,JSON.stringify(result));
      return result;
    });
  }
  apply(s, actor, action, p, key) {
    const store=this.store, now=this.now(); let c=s.company;
    const transfer=(kind,memo,from,to,amount)=>store.transfer(key,kind,memo,c?.id||null,from,to,amount);
    if(action==='propose'){
      check(!c&&!s.proposal,'Bu joy allaqachon band.');
      check(typeof p.name==='string' && p.name.trim().length>=3 && p.name.trim().length<=40,'Kompaniya nomi 3–40 belgi bo‘lsin.');
      check(p.partner!==actor && store.db.prepare('SELECT id FROM users WHERE id=?').get(p.partner),'Boshqa hamkorni tanlang.');
      check(money(p.mine)&&money(p.theirs)&&p.mine>=100000&&p.theirs>=100000,'Har bir hissa kamida 100 000 so‘m bo‘lsin.');
      const total=p.mine+p.theirs;
      check(Number.isSafeInteger(total) && (BigInt(p.mine)*10000n)%BigInt(total)===0n,'Ulushni 0,01% aniqlikda ifodalash mumkin bo‘lsin.');
      const myShare=Number(BigInt(p.mine)*10000n/BigInt(total));
      check(store.balance('wallet:'+actor)>=p.mine,'Shaxsiy hamyonda mablag‘ yetmaydi.');
      const id=randomUUID();store.account('escrow:'+id);
      transfer('reserve','Ta’sis uchun mablag‘ rezervi','wallet:'+actor,'escrow:'+id,p.mine);
      s.proposal={id,name:p.name.trim(),creator:actor,termsVersion:1,expires:now+24*3600000,contributions:[{id:actor,amount:p.mine,share:myShare},{id:p.partner,amount:p.theirs,share:10000-myShare}],accepted:[actor]};
      event(s,'Bo‘sh ustaxona uchun hamkorlik taklifi yaratildi.'); return;
    }
    if(action==='acceptFounding'||action==='cancelFounding'){
      const q=s.proposal;check(q&&q.contributions.some(o=>o.id===actor),'Sizga tegishli taklif yo‘q.',403);
      check(p.proposalId===q.id && p.termsVersion===q.termsVersion,'Taklif shartlari yangilangan.',409);
      if(action==='cancelFounding') { this.release(s,key,'Hamkorlik bekor qilindi.');return; }
      check(now<q.expires,'Taklif muddati tugagan.');
      check(!q.accepted.includes(actor),'Taklif avval qabul qilingan.');
      const contribution=q.contributions.find(o=>o.id===actor);
      transfer('reserve','Hamkor hissasi rezervi','wallet:'+actor,'escrow:'+q.id,contribution.amount);
      q.accepted.push(actor);
      if(q.accepted.length===q.contributions.length){
        c={id:randomUUID(),name:q.name,owners:q.contributions.map(o=>({...o})),foundedAt:now,terms:foundingTerms(q),leased:false,equipment:false,lifts:[false,false],temporary:false,staff:[],stock:0,price:200000,bookings:[],scenarioStarted:false,nextSettlement:null,report:null,history:[],reputation:0,listing:null,debts:[],contracts:[],payrollPeriods:0};
        store.account('company:'+c.id);store.account('inventory:'+c.id);store.account('asset:'+c.id);
        store.transfer(key,'capital','Hamkorlar kompaniya tashkil etdi',c.id,'escrow:'+q.id,'company:'+c.id,q.contributions.reduce((a,o)=>a+o.amount,0));
        s.company=c;s.proposal=null;event(s,c.name+' ochildi. Ikki hamkor, bitta kompaniya.','success');
      } return;
    }
    check(c,'Avval kompaniya tashkil eting.');
    if(action==='acquire'){
      const l=c.listing;check(l?.status==='open'&&now<l.expires,'Sotuv taklifi yopilgan yoki eskirgan.',409);
      check(!c.owners.some(o=>o.id===actor),'O‘z kompaniyangizni sotib ololmaysiz.');
      check(p.listingId===l.id&&p.disclosureVersion===l.disclosureVersion&&p.price===l.price,'Sotuv shartlari o‘zgargan. Yangisini o‘qing.',409);
      check(l.approvals.length===c.owners.length,'Hamma egalar hali imzolamagan.');
      check(l.companyFingerprint===this.fingerprint(c),'Kompaniya holati o‘zgargan. Egalar taklifni yangilashi kerak.',409);
      check(store.balance('wallet:'+actor)>=l.price,'Sotib olish uchun mablag‘ yetarli emas.');
      const sellers=c.owners.map(o=>({id:o.id,share:o.share,payout:l.price*o.share/10000}));
      check(sellers.every(o=>money(o.payout)),'Sotuv narxi ulushlarga butun so‘mda bo‘linishi kerak.');
      for(const seller of sellers)transfer('acquisition','Kompaniya ulushi sotildi','wallet:'+actor,'wallet:'+seller.id,seller.payout);
      c.owners=[{id:actor,share:10000,amount:l.price}];c.listing={...l,status:'sold',buyer:actor,sellers,closedAt:now};
      event(s,c.name+' yangi egaga o‘tdi. Ishlar va majburiyatlar kompaniyada qoldi.','success');return;
    }
    owner(c,actor);
    const treasury='company:'+c.id;
    if(action==='cancelListing'){check(c.listing?.status==='open','Ochiq sotuv yo‘q.');c.listing.status='cancelled';event(s,'Sotuv taklifi bekor qilindi.');return;}
    if(action==='approveSale'){
      const l=c.listing;check(l?.status==='open'&&now<l.expires&&l.id===p.listingId&&l.disclosureVersion===p.disclosureVersion,'Sotuv shartlari eskirgan.',409);
      check(l.companyFingerprint===this.fingerprint(c),'Kompaniya holati o‘zgargan.',409);
      check(!l.approvals.includes(actor),'Siz avval imzolagansiz.');l.approvals.push(actor);event(s,'Sotuv kelishuvi yana bir imzo oldi.');return;
    }
    operational(c);
    switch(action){
      case 'lease':
        check(!c.leased,'Joy avval ijaraga olingan.');
        transfer('setup_rent','2 bay ustaxona: boshlang‘ich ijara',treasury,'landlord',200000);c.leased=true;event(s,'Ikki bayli ustaxona ijaraga olindi.');break;
      case 'equipment':
        check(c.leased&&!c.equipment,'Avval joyni ijaraga oling; jihoz faqat bir marta olinadi.');
        transfer('capex','Ikki ko‘targich sotib olindi',treasury,'equipment',600000);
        store.entry(key,'asset','Ko‘targichlar aktivga olindi',c.id,[[store.account('asset:'+c.id),600000],[store.account('equity:equipment',true),-600000]]);
        c.equipment=true;c.lifts=[true,true];event(s,'Ikkita ko‘targich o‘rnatildi.');break;
      case 'hire':
        check(c.leased&&STAFF[p.employee]&&!c.staff.includes(p.employee),'Xodimni tanlash mumkin emas.');
        c.staff.push(p.employee);event(s,STAFF[p.employee].name+' jamoaga qo‘shildi.');break;
      case 'buyParts':
        check(Number.isInteger(p.quantity)&&p.quantity>=1&&p.quantity<=100,'1–100 dona orasida tanlang.');
        transfer('inventory_purchase','Ehtiyot qismlar xaridi',treasury,'supplier',p.quantity*PART);
        store.entry(key,'inventory','Ehtiyot qismlar omborga olindi',c.id,[[store.account('inventory:'+c.id),p.quantity*PART],[store.account('inventory:clearing',true),-p.quantity*PART]]);
        c.stock+=p.quantity;event(s,p.quantity+' to‘plam ehtiyot qismlar yetib keldi.');break;
      case 'price':
        check(money(p.price)&&p.price>=100000&&p.price<=500000,'Narx 100 000–500 000 so‘m oralig‘ida bo‘lsin.');
        c.price=p.price;event(s,'Keyingi buyurtmalar uchun xizmat narxi yangilandi.');break;
      case 'startScenario':
        check(!c.scenarioStarted && c.equipment && c.staff.length===3 && c.stock>=6,'Ikki ko‘targich, boshqaruvchi, ikki usta va 6 ta detal to‘plami kerak.');
        for(let i=0;i<6;i++){
          const id=randomUUID(),account=store.account('customer:'+id);
          store.transfer(key,'external_income','Mashq mijozining ajratilgan budjeti',null,'external:grant',account,500000);
          c.bookings.push({id,name:names[i],price:c.price,account,status:'waiting',acceptedAt:now,promisedTick:s.tick+1,parts:1,bay:null});
        }
        c.scenarioStarted=true;c.lifts[1]=false;c.nextSettlement=now+this.period;
        event(s,'6 ta bron bor. Ikkinchi ko‘targich buzildi: bir smenada 3 ta mashinaga ulguramiz.','warning');break;
      case 'rentLift':
        check(c.scenarioStarted&&!c.temporary&&c.lifts.includes(false)&&c.bookings.some(b=>b.status==='waiting'),'Hozir vaqtinchalik ko‘targich kerak emas.');
        transfer('temporary_lift','Bir smenaga vaqtinchalik ko‘targich',treasury,'supplier',180000);c.temporary=true;
        event(s,'Vaqtinchalik ko‘targich keldi. Yetarli usta va detal bo‘lsa, 6 ta mashinaga xizmat qilamiz.','success');break;
      case 'defer': {
        const pending=c.bookings.filter(b=>b.status==='waiting');check(pending.length>3,'Ko‘chirish uchun ortiqcha bron yo‘q.');
        for(const b of pending.slice(3)){b.status='deferred';b.promisedTick=s.tick+2;}
        event(s,'Uch mijoz keyingi smenaga rozi bo‘ldi. Tushum kechroq keladi.');break;
      }
      case 'practiceSettle':
        check(s.practice&&c.nextSettlement,'Hisoblashga tayyor smena yo‘q.');
        this.settle(s,key);break;
      case 'list': {
        check(c.report,'Sotuvdan oldin kamida bitta smena hisobotini oling.');
        check(money(p.price)&&p.price>=100000&&p.price<=100000000&&c.owners.every(o=>Number.isInteger(p.price*o.share/10000)),'Narxni ulushlar bo‘yicha butun so‘mga bo‘lish mumkin bo‘lsin.');
        const snapshot=this.disclosure(c),id=randomUUID();
        c.listing={id,status:'open',price:p.price,approvals:[actor],disclosureVersion:s.version+1,snapshot,companyFingerprint:this.fingerprint(c),created:now,expires:now+24*3600000};
        event(s,c.name+' sotuvga qo‘yildi. Barcha egalar bir xil shartlarni imzolaydi.');break;
      }
      default:check(false,'Noma’lum amal.');
    }
  }
  disclosure(c) {
    return {name:c.name,at:this.now(),treasury:this.store.balance('company:'+c.id),stock:c.stock,equipment:c.equipment,lifts:c.lifts,staff:c.staff.map(id=>STAFF[id]),leased:c.leased,debts:c.debts,contracts:c.contracts,pending:c.bookings.filter(b=>b.status!=='completed').length,report:c.report,history:c.history,owners:c.owners.map(o=>({id:o.id,share:o.share}))};
  }
  fingerprint(c) {return createHash('sha256').update(JSON.stringify({treasury:this.store.balance('company:'+c.id),stock:c.stock,lifts:c.lifts,staff:c.staff,bookings:c.bookings,debts:c.debts,contracts:c.contracts,owners:c.owners})).digest('hex');}
  release(s,key,text) {
    const q=s.proposal;
    for(const id of q.accepted){const a=q.contributions.find(o=>o.id===id);this.store.transfer(key,'release','Ta’sis rezervi qaytarildi',null,'escrow:'+q.id,'wallet:'+id,a.amount);}
    s.proposal=null;event(s,text);
  }
  settle(s,key) {
    const c=s.company, store=this.store, tick=s.tick+1;
    check(c?.nextSettlement,'Smena belgilanmagan.');
    const tickId=s.cityId+':'+tick+':'+s.rulesVersion;
    check(!store.db.prepare('SELECT id FROM ticks WHERE id=?').get(tickId),'Smena avval hisoblangan.',409);
    const treasury='company:'+c.id;
    const liftCapacity=(c.lifts.filter(Boolean).length+(c.temporary?1:0))*3;
    const labourCapacity=c.staff.filter(id=>id.startsWith('mechanic')).length*3;
    const candidates=c.bookings.filter(b=>b.status==='waiting'||(b.status==='deferred'&&b.promisedTick<=tick));
    const count=Math.min(liftCapacity,labourCapacity,c.stock,candidates.length);
    let revenue=0,completed=0;
    for(const b of candidates.slice(0,count)){
      if(store.balance(b.account)<b.price)continue;
      store.transfer(key,'sale','Xizmat: '+b.name,c.id,b.account,treasury,b.price);
      store.transfer(key,'parts_consumed','Ishlatilgan detal',c.id,'inventory:'+c.id,'expense:parts',PART);
      store.transfer(key,'job_labour','Bajarilgan ish uchun haq',c.id,treasury,'household:'+c.staff.filter(id=>id.startsWith('mechanic'))[completed%2],LABOUR);
      c.stock--; b.status='completed';b.completedAt=this.now();b.bay=completed%Math.max(1,liftCapacity/3);completed++;revenue+=b.price;
    }
    const wages=c.staff.reduce((sum,id)=>sum+STAFF[id].wage,0);
    const rent=100000;
    const obligations=[];
    for(const id of c.staff)obligations.push({account:'household:'+id,amount:STAFF[id].wage,kind:'payroll',memo:STAFF[id].name+' smena maoshi'});
    obligations.push({account:'landlord',amount:rent,kind:'rent',memo:'Ustaxona smena ijarasi'});
    let unpaid=0;
    for(const due of obligations){
      if(store.balance(treasury)>=due.amount)store.transfer(key,due.kind,due.memo,c.id,treasury,due.account,due.amount);
      else {c.debts.push({...due,id:randomUUID(),tick,status:'overdue'});unpaid+=due.amount;}
    }
    const depreciation=Math.min(50000,store.balance('asset:'+c.id));
    if(depreciation)store.transfer(key,'depreciation','Jihoz amortizatsiyasi',c.id,'asset:'+c.id,'expense:depreciation',depreciation);
    const temporary=c.temporary?180000:0;
    const report={tick,at:this.now(),completed,revenue,parts:completed*PART,labour:completed*LABOUR,wages,rent,depreciation,temporary,profit:revenue-completed*(PART+LABOUR)-wages-rent-depreciation-temporary,unpaid,capacity:Math.min(liftCapacity,labourCapacity),remaining:c.bookings.filter(b=>b.status!=='completed').length,treasury:store.balance(treasury)};
    c.report=report;c.history.push(report);c.payrollPeriods++;c.temporary=false;c.reputation+=completed;
    s.tick=tick;
    c.nextSettlement=report.remaining?this.now()+this.period:null;
    if(c.listing?.status==='open')c.listing.status='expired';
    store.db.prepare('INSERT INTO ticks VALUES(?,?)').run(tickId,this.now());
    event(s,completed+' ta xizmat tugadi. Smena hisoboti tayyor.','success');
  }
  due() {
    const s=this.store.state(),now=this.now();
    if(!(s.proposal&&s.proposal.expires<=now)&&!(s.company?.nextSettlement&&s.company.nextSettlement<=now))return false;
    this.store.atomic(()=>{
      const state=this.store.state();
      if(state.proposal&&state.proposal.expires<=now)this.release(state,'expiry:'+state.proposal.id,'Ta’sis muddati tugadi. Rezerv qaytarildi.');
      if(state.company?.nextSettlement&&state.company.nextSettlement<=now)this.settle(state,'tick:'+state.cityId+':'+(state.tick+1));
      state.version++;this.store.write(state);
    });return true;
  }
}
module.exports={Game,STAFF,PERIOD};
