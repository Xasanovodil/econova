(function(root){
const COST=6000,EXPENSE=30000;
function episode(now=Date.now()){const d=new Date(now);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));const start=d.getTime();return {id:new Date(start).toISOString().slice(0,10),start,news:start+2*86400000,deadline:start+6*86400000+13*3600000};}
function calculate(stock,price){if(!Number.isInteger(stock)||stock<0||!Number.isFinite(price)||price<4000||price>20000)throw Error('Noto‘g‘ri qaror');const demand=Math.max(0,Math.floor(130-(price-10000)/200));const sold=Math.min(stock,demand);const revenue=sold*price;return {sold,demand,revenue,expenses:EXPENSE,profit:revenue-sold*COST-EXPENSE,remaining:stock-sold};}
const api={COST,EXPENSE,episode,calculate};if(typeof module!=='undefined')module.exports=api;else root.Economy=api;
})(globalThis);
