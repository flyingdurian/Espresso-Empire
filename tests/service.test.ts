import test from 'node:test'
import assert from 'node:assert/strict'
import {readData} from '../scripts/read.ts'
import {Shift, resources, type ShiftData, type Item, type Action} from '../src/service/shift.ts'
import type {Tuning} from '../src/content/model.ts'
const data:ShiftData=await readData('lounge-shift.json'),tuning:Tuning=await readData('tuning.json')
const create=()=>new Shift(structuredClone(data),tuning)
function ticks(g:Shift,n:number){for(let i=0;i<n;i++)g.step()}
function prepare(g:Shift,tool:Action){g.command({action:'prepare',tool});ticks(g,g.work)}
function travel(g:Shift){g.command({action:'travel'});ticks(g,g.transit)}
function refill(g:Shift){
  travel(g)
  for(const k of resources){g.command({action:'station',resource:k});ticks(g,g.ticks(.45))}
  ticks(g,g.ticks(Math.max(...resources.map(k=>data.supplies[k].cycle))))
  for(const k of resources.filter(k=>data.supplies[k].cycle)){g.command({action:'station',resource:k});ticks(g,g.ticks(.5))}
  travel(g)
}
test('a free pull starts before any order and a second tap cannot consume another dose',()=>{
  const g=create();ticks(g,50);assert.equal(g.tick,0)
  g.command({action:'guest',seat:0});assert.equal(g.started,false)
  g.command({action:'prepare',tool:'standard'});g.command({action:'prepare',tool:'short'})
  ticks(g,g.work);assert.equal(g.held,'espresso');assert.equal(g.stock.dose,data.supplies.dose.start-1)
  assert.ok(g.seats.every(s=>s.state==='awaiting'))
  ticks(g,g.ticks(10));g.command({action:'guest',seat:1});assert.equal(g.coins,0);assert.equal(g.held,'espresso')
  g.command({action:'guest',seat:0});assert.equal(g.held,null);assert.equal(g.served,1);assert.equal(g.smiles,1)
})
for(const [id,r] of Object.entries(data.recipes)){
 test('freely assemble '+id,()=>{
  const g=create()
  for(const tool of r.steps)prepare(g,tool)
  assert.equal(g.active,id);assert.equal(g.served,0)
 })
}
test('wrong additions and failed pulls preserve ingredient stock and the active item',()=>{
 const g=create();prepare(g,'milk');assert.equal(g.stock.milk,data.supplies.milk.start);assert.equal(g.started,false)
 prepare(g,'short');prepare(g,'milk');assert.equal(g.held,'ristretto')
 prepare(g,'standard');assert.equal(g.stock.dose,data.supplies.dose.start-1)
})
test('two independent wells and an active drink survive full parking, wrong delivery and targeted discard',()=>{
 const g=create()
 prepare(g,'short');g.command({action:'cradle'});prepare(g,'cookie');g.command({action:'cradle'})
 prepare(g,'standard');g.command({action:'cradle'});assert.deepEqual(g.parked,['ristretto','cookie']);assert.equal(g.active,'espresso')
 g.command({action:'well',index:1});g.command({action:'guest',seat:0});assert.equal(g.held,'cookie')
 g.command({action:'discard'});assert.equal(g.trash,1);assert.deepEqual(g.parked,['ristretto',null]);assert.equal(g.active,'espresso')
})
test('serve a parked cup during a running pull without interrupting it',()=>{
 const g=create();prepare(g,'standard');g.command({action:'cradle'});ticks(g,g.ticks(3))
 g.command({action:'prepare',tool:'short'});g.command({action:'well',index:0});g.command({action:'guest',seat:0})
 assert.equal(g.served,1);assert.ok(g.work);ticks(g,g.work);assert.equal(g.active,'ristretto')
})
test('bar travel keeps waiting patience running and keeps new orders hidden until proximity',()=>{
 const g=create();prepare(g,'standard');ticks(g,g.ticks(2));const left=g.seats[0].left;travel(g);ticks(g,g.ticks(12))
 assert.ok(g.seats[0].left<left);assert.equal(g.seats[1].state,'awaiting');assert.equal(g.active,'espresso')
 g.command({action:'prepare',tool:'milk'});assert.equal(g.stock.milk,data.supplies.milk.start);travel(g);assert.equal(g.seats[1].state,'waiting')
})
test('independent batches, pantry pickup, loading bounds and hold expiry',()=>{
 const g=create();prepare(g,'standard');travel(g)
 for(const k of resources)g.command({action:'station',resource:k})
 assert.equal(g.stock.cold,data.supplies.cold.capacity)
 ticks(g,g.ticks(5));for(const k of ['dose','milk','warm'] as const)assert.equal(g.stations[k].phase,'ready')
 g.command({action:'station',resource:'dose'});assert.equal(g.stock.dose,data.supplies.dose.capacity);assert.equal(g.stations.dose.count,3)
 ticks(g,g.ticks(14));assert.equal(g.stations.dose.phase,'idle')
})
test('expiry never consumes a prepared item and the shift ends exactly once',()=>{
 const g=create();prepare(g,'standard');ticks(g,5000);assert.equal(g.held,'espresso');assert.equal(g.expired,data.orders.length)
 assert.equal(g.stars,0);assert.equal(g.ended,true);const t=g.tick;g.step();assert.equal(g.tick,t)
})
function play(){
 const g=create()
 prepare(g,'short');ticks(g,g.ticks(3));g.command({action:'discard'})
 for(let loop=0;loop<500&&!g.ended;loop++){
   const i=g.seats.findIndex(s=>s.state==='waiting')
   if(i<0){ticks(g,5);continue}
   const item:Item=g.remaining(g.seats[i])[0],steps=data.recipes[item].steps
   if(steps.some(k=>{const r=data.actions[k].supply;return r&&!g.stock[r]})){refill(g);continue}
   for(const k of steps){ticks(g,g.ticks(.7));prepare(g,k)}
   ticks(g,g.ticks(.9));g.command({action:'guest',seat:i})
 }
 return g
}
test('paced three-star service includes a mistake, hesitation, mixed orders and honest refill trips',()=>{
 const g=play();assert.ok(g.ended);assert.equal(g.served,8);assert.equal(g.expired,0);assert.equal(g.stars,3)
 assert.equal(g.trash,1);assert.ok(g.rides>=2);assert.deepEqual(play().events,g.events)
})
