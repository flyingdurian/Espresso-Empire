import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {Bench,stockKey,type Config,type Drink} from '../src/counter/bench.ts'
import type {Tuning} from '../src/content/model.ts'
import {activeOrderIds,ingredientProgress,orderNumber,orderRecipe} from '../src/counter/order-guide.ts'
import {levelConfig,freshProgress,levels} from '../src/counter/campaign.ts'
import {filterPose,filterSockets} from '../src/counter/filter-pose.ts'
import {travelingPumpPose,tool} from '../src/counter/drink-motion.ts'
import {toppingSources} from '../src/counter/station-layout.ts'
import {saucerTouch,shotRackTouch} from '../src/counter/touch-layout.ts'
const data=<T>(name:string)=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url),'utf8')) as T
const game=()=>new Bench(data<Config>('counter'),data<Tuning>('tuning'))
const step=(g:Bench,n:number)=>{for(let i=0;i<n;i++)g.step()}
const seconds=(g:Bench,n:number)=>step(g,g.ticks(n))
test('stable ascending active order IDs include ready guests at Window and survive turns',()=>{
 const g=game();g.guests.forEach(v=>v.state='queued');g.guests[0].state='waiting';g.guests[3].state='ready';g.guests[2].state='waiting';g.guests[1].state='paid'
 assert.deepEqual(activeOrderIds(g).map(orderNumber),[1,3,4]);g.end='Window';assert.deepEqual(activeOrderIds(g),[0,2,3])
})
test('ingredient completion is per selected cup, validates vessel/size and does not credit an in-flight shot',()=>{
 const g=game();g.data.orders[0]={...g.data.orders[0],drink:'cappuccino',mode:'Dine in',size:'Medium'}
 const r=orderRecipe(g,0)!;g.command({action:'cup',cup:'bowl',slot:0});g.command({action:'cup',cup:'bowl',slot:1});const c=g.cups[0]!;c.shot='standard';c.poured=false;c.add=['milk'];g.cups[1]!.add=['foam']
 assert.deepEqual(ingredientProgress(g,0,r,c),{vessel:true,coffee:false,adds:[true,false]});c.poured=true;assert.equal(ingredientProgress(g,0,r,c).coffee,true)
 assert.deepEqual(ingredientProgress(g,0,r,g.cups[1]).adds,[false,true]);c.add.push('ice');assert.deepEqual(ingredientProgress(g,0,r,c).adds,[false,false])
})
test('spent tap automatically purges, knocks, refills finite beans, grinds four seconds and returns to original unlocked group',()=>{
 const g=game();g.groups[1].pulls=0;g.beans=0;const bags=g.bags
 g.command({action:'serviceGroup',head:1});assert.equal(g.basket,'released');assert.ok(g.groups[1].flush);assert.equal(g.assistedService,true)
 const release=g.basketCycle;g.command({action:'serviceGroup',head:1});assert.equal(g.basketCycle,release)
 g.command({action:'pull',head:0,shot:'short'});seconds(g,g.data.stations.handleTravel);assert.equal(g.basket,'knocking')
 seconds(g,g.data.stations.knock);assert.equal(g.basket,'clean');seconds(g,g.data.stations.handleTravel);assert.equal(g.bags,bags-1);assert.ok(g.hopperFill)
 seconds(g,g.data.stations.load);assert.equal(g.basket,'grinding');assert.equal(g.grind!.end-g.grind!.start,g.ticks(4));assert.equal(g.beans,g.data.capacity.hopper-3)
 step(g,g.ticks(4)-1);assert.equal(g.basket,'grinding');step(g,1);assert.equal(g.basket,'dosedHeld');seconds(g,g.data.stations.handleTravel)
 assert.equal(g.basket,'attached');assert.equal(g.groups[1].dirty,false);assert.equal(filterPose(g,g.tick).x,filterSockets[1]);assert.equal(g.groups[1].pulls,0)
 g.command({action:'serviceGroup',head:0});assert.equal(g.basket,'attached');g.command({action:'serviceGroup',head:1});seconds(g,g.data.stations.handleLock);assert.equal(g.groups[1].pulls,3);assert.equal(g.basket,'mounted');assert.equal(g.assistedService,false)
 seconds(g,10);assert.equal(g.groups[0].pots[0],'short')
})
test('automatic service does not create infinite beans or lock an empty basket',()=>{
 const g=game();g.groups[0].pulls=0;g.beans=0;g.bags=0;g.bagCounts.fill(0);g.command({action:'serviceGroup',head:0});seconds(g,10);assert.equal(g.basket,'clean');assert.equal(g.grind,null);g.command({action:'lock'});assert.equal(g.groups[0].pulls,0)
})
test('bulk takeaway restock conserves reserve stock, leaves ceramics alone and is idempotent',()=>{
 const g=game(),paper=stockKey('paper','Small'),clear=stockKey('clear','Large');g.stock[paper]=2;g.reserve[paper]=1;g.stock[clear]=0;g.lidStock.clear=2;g.lidReserve.clear=1;g.stock.demi=1
 g.command({action:'restockAll'});assert.equal(g.stock[paper],3);assert.equal(g.reserve[paper],0);assert.equal(g.stock[clear],5);assert.equal(g.reserve[clear],0);assert.equal(g.lidStock.clear,3);assert.equal(g.lidReserve.clear,0);assert.equal(g.stock.demi,1)
 const state=JSON.stringify([g.stock,g.reserve,g.lidStock,g.lidReserve]),events=g.events.length;g.command({action:'restockAll'});assert.equal(JSON.stringify([g.stock,g.reserve,g.lidStock,g.lidReserve]),state);assert.equal(g.events.length,events)
})
test('traveling syrup pump is upright, moves its nozzle to the cup and returns exactly home',()=>{
 const rim={x:713,y:590},a='caramel',start=travelingPumpPose(a,0,rim,.52),middle=travelingPumpPose(a,.45,rim,.52),end=travelingPumpPose(a,1,rim,.52)
 assert.equal(start.x,tool(a,0,0).home.x);assert.equal(end.x,start.x);assert.equal(end.y,start.y);assert.equal(middle.angle,0);assert.ok(middle.plunger>0);assert.ok(Math.abs(middle.nozzle.x-rim.x)<.001);assert.ok(middle.nozzle.y<rim.y)
})
test('special requests require exact toppings; topping cannot be applied early, can be lidded and handed off',()=>{
 const g=game();g.data.orders[0]={...g.data.orders[0],drink:'latte',mode:'To go',size:'Small',toppings:['caramelDrizzle']};g.guests[0].state='waiting';g.end=g.data.orders[0].end
 g.command({action:'cup',cup:'paper',size:'Small',slot:0});const c=g.cups[0]!
 assert.equal(g.canDropPour({action:'add',slot:0,add:'caramelDrizzle'}),false)
 c.shot='standard';c.poured=true;c.add=['milk'];assert.equal(g.canServe(0,'cup',0,true),false)
 g.command({action:'add',add:'caramelDrizzle',slot:0});assert.ok(g.pouringAt(0));assert.equal(g.canServe(0,'cup',0,true),false);seconds(g,g.data.stations.finish)
 assert.equal(g.recipe(c),'latte');assert.equal(g.canServe(0,'cup',0,true),true);assert.equal(g.matchesOrder(c,{...g.data.orders[0],toppings:undefined}),false)
 g.command({action:'lid',material:'paper'});assert.equal(c.lid,true);g.command({action:'serve',guest:0,slot:0,kind:'cup'});assert.equal(g.guests[0].gotDrink,true)
})
test('new signature recipes appear in later rotation and all four modifiers have registered assets',()=>{
 const g=game(),late=levelConfig(g.data,levels.length,freshProgress().ranks)
 assert.ok(late.orders.some(o=>o.drink==='strawberrymatcha'));assert.ok(late.orders.some(o=>o.drink==='cinnamoncaramel'));assert.ok(late.orders.some(o=>o.toppings?.length))
 for(const k of ['empire_strawberry_drizzle','empire_caramel_drizzle','empire_cinnamon_dust','empire_cocoa_dust'])assert.ok(readFileSync(new URL('../public/empire_toppings/'+k+'.webp',import.meta.url)).length>100)
})
test('finishing controls are disjoint from each other, full saucers and shot reserve',()=>{
 const g=game();const boxes=Object.values(toppingSources).map(p=>({...p,y:p.y-p.h/2})),others=[shotRackTouch(),...([0,1] as const).flatMap(i=>[saucerTouch(i,null),...(['paper','clear','glass','tall','bowl','mug','demi'] as const).map(cup=>saucerTouch(i,{cup,size:'Large'}))])]
 const intersect=(a:{x:number;y:number;w:number;h:number},b:typeof a)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2
 boxes.forEach((a,i)=>{for(const b of [...boxes.slice(i+1),...others])assert.equal(intersect(a,b),false)})
})
