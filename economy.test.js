const {test}=require('node:test');const assert=require('node:assert/strict');const E=require('./economy');
test('sales follow demand and account for cost',()=>{assert.deepEqual(E.calculate(150,10000),{sold:130,demand:130,revenue:1300000,expenses:30000,profit:490000,remaining:20})});
test('higher price lowers demand; stock caps sales',()=>{assert.equal(E.calculate(150,12000).demand,120);assert.equal(E.calculate(20,10000).sold,20);assert.equal(E.calculate(20,10000).profit,50000)});
test('reject invalid prices and inventory',()=>{assert.throws(()=>E.calculate(-1,10000));assert.throws(()=>E.calculate(10,NaN));assert.throws(()=>E.calculate(10,3000))});
test('weekly cutoff is Sunday 18:00 Tashkent',()=>{const e=E.episode(Date.parse('2026-10-30T12:00:00Z'));assert.equal(e.id,'2026-10-26');assert.equal(new Date(e.deadline).toISOString(),'2026-11-01T13:00:00.000Z')});
