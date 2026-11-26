import test from 'node:test'
import assert from 'node:assert/strict'
import {Bench,ingredientStation,type Config,type Cup,type End,type Food,type Shot,type Size} from '../src/counter/bench.ts'
import {readData} from '../scripts/read.ts'
import {levelConfig,freshProgress,buyUpgrade,completeLevel,levels,lunchShift,piazzaShift} from '../src/counter/campaign.ts'
import {espressoLayout,portafilterPose,knockPuckPosition} from '../src/counter/workflow.ts'
import {cameraOffset} from '../src/counter/viewport.ts'
import type {Tuning} from '../src/content/model.ts'
const cfg:Config=await readData('counter.json'),tuning:Tuning=await readData('tuning.json')
const create=()=>new Bench(structuredClone(cfg),tuning)
function run(g:Bench,seconds:number){for(let i=0;i<g.ticks(seconds);i++)g.step()}
function to(g:Bench,view:End|'Kitchen'){if(g.view!==view){g.command({action:'to',view});run(g,cfg.stations.turn)}}
function cup(g:Bench,id:Cup,size:Size='Medium'){g.command({action:'cup',cup:id,size})}
function pull(g:Bench,shot:Shot){
 if(!g.pulls){
  g.command({action:'release'});g.command({action:'purge'});g.command({action:'pick'});g.command({action:'knock'});run(g,1)
  if(!g.beans){g.command({action:'beans'});run(g,cfg.stations.load)}
  g.command({action:'pick'})
  g.command({action:'grind'});run(g,g.data.stations.grinder)
  g.command({action:'attach',head:g.serviceHead});g.command({action:'lock'});run(g,cfg.stations.handleLock)
 }
 g.command({action:'pull',shot});run(g,cfg.stations[shot]);g.command({action:'pour'});run(g,cfg.stations.transfer)
}
function prepare(g:Bench,id:string,away=false,size:Size='Medium',frontOnly=false){
 const r=cfg.recipes[id],end=g.end
 if(r.add.includes('orange')&&g.orangeSource(size==='Large'?cfg.capacity.largePortions:1)<0){
  if(g.orangeDock===null)g.command({action:'moveOrange',from:g.orangeReserve.indexOf(0),to:-1})
  g.command({action:'citrus'});run(g,cfg.stations.citrus)
  g.command({action:'moveOrange',from:-1,to:3})
 }
 for(const [add,action] of [['tea','tea'],['cold','blend']] as const){
  if(!r.add.includes(add))continue
  if(!frontOnly)to(g,'Kitchen');g.command({action});run(g,cfg.stations[action]);g.command({action});to(g,end)
 }
 cup(g,away?r.travelCup:r.cup,size)
 const same=g.cups[g.selected];assert.ok(same)
 if(r.add.includes('ice')&&g.ice<(size==='Large'?cfg.capacity.largePortions:1)){g.command({action:'refillIce'});run(g,cfg.stations.refillIce)}
 if((r.add.includes('milk')||r.add.includes('foam'))&&!g.milkTank){g.command({action:'refillMilk'});run(g,cfg.stations.refillMilk+.8)}
 if(r.add.includes('foam')&&!g.textures.airy){g.command({action:'steam',texture:'airy'});run(g,cfg.stations.steamer)}
 if(r.add.includes('milk')&&!g.milk){g.command({action:'steam'});run(g,cfg.stations.steamer)}
 if(r.shot)pull(g,r.shot)
 for(const add of r.add){g.command({action:'add',add});run(g,g.data.stations[ingredientStation(add)]+(add==='water'?.8:0));assert.equal(g.cups[g.selected],same)}
 assert.equal(g.recipe(same),id)
}
function cook(g:Bench,food:Food,frontOnly=false){
 const end=g.end;if(!frontOnly)to(g,'Kitchen')
 if(food==='brownie'||food==='madeleine'||food==='cookie'||food==='chips')g.command({action:'snack',food})
 else if(food==='baked'){g.command({action:'load'});g.command({action:'oven'});run(g,cfg.stations.oven);g.command({action:'oven'})}
 else {g.command({action:'sandwich'});if(food==='pesto'){g.command({action:'pesto'});run(g,g.data.stations.pesto)}g.command({action:'press'});run(g,cfg.stations.press);g.command({action:'press'})}
 to(g,end);assert.equal(g.towel[g.foodIndex]?.food,food)
}
for(const id of Object.keys(cfg.recipes))for(const away of [false,true])test(id+' in '+(away?'takeaway':'dine-in')+' vessel',()=>{
 const g=create();prepare(g,id,away);g.command({action:'lid'});assert.equal(g.cups[0]?.lid,away)
})
test('cups never auto-pour; a pitcher transfers only on an explicit tap or drag command',()=>{
 const g=create();g.command({action:'pull',shot:'short'});cup(g,'demi');run(g,cfg.stations.short)
 assert.equal(g.pot,'short');assert.equal(g.cups[0]?.shot,null)
 g.command({action:'select',slot:1});cup(g,'demi');assert.equal(g.pot,'short')
 assert.equal(g.cups[1]?.shot,null);g.command({action:'select',slot:0});assert.equal(g.pot,'short')
 g.command({action:'pour',slot:1});assert.equal(g.pot,null);assert.equal(g.pour?.slot,1)
 g.command({action:'trash',target:{kind:'drink',slot:1}});run(g,1)
 assert.equal(g.recipe(g.cups[1]),'ristretto');assert.equal(g.cups[0]?.shot,null)
})
test('served dish returns, loads, washes offscreen and replenishes the correct ceramic once',()=>{
 const g=create();prepare(g,'latte');g.command({action:'guest',guest:0});assert.equal(g.served,1)
 assert.equal(g.stock.glass,cfg.capacity.ceramic-1);run(g,cfg.stations.dishReturn);to(g,'Kitchen')
 g.command({action:'washLoad'});assert.deepEqual(g.washRack,['glass']);g.command({action:'washRun'})
 to(g,'Window');run(g,cfg.stations.wash);assert.equal(g.washed,true);assert.equal(g.stock.glass,cfg.capacity.ceramic-1)
 to(g,'Kitchen');g.command({action:'washRun'});g.command({action:'washRun'});assert.equal(g.stock.glass,cfg.capacity.ceramic);assert.equal(g.dirty.length,0)
})
test('drag disposal uses its source slot and disposable reserve is finite and size-specific',()=>{
 const g=create();cup(g,'demi');for(let i=0;i<cfg.capacity.takeaway;i++){
  cup(g,'paper','Small');g.command({action:'select',slot:0});g.command({action:'trash',target:{kind:'drink',slot:1}})
 }
 assert.ok(g.cups[0]);assert.equal(g.stock['paper-Small'],0);assert.equal(g.stock['paper-Large'],5)
 cup(g,'paper','Small');assert.equal(g.cups[1],null);g.command({action:'drawer'})
 g.command({action:'restock',cup:'paper',size:'Small'});assert.equal(g.stock['paper-Small'],5);assert.equal(g.reserve['paper-Small'],0)
})
test('three fast oven loads and two towel spaces preserve the remaining pastry',()=>{
 const g=create();to(g,'Kitchen');for(let i=0;i<4;i++)g.command({action:'load'});assert.equal(g.raw,3)
 g.command({action:'oven'});to(g,'Window');run(g,cfg.stations.oven);assert.equal(g.warm,3);to(g,'Kitchen')
 for(let i=0;i<3;i++)g.command({action:'oven'});assert.equal(g.warm,1);assert.equal(g.towel.filter(Boolean).length,2)
})
test('machines run through turns, hidden tickets open on proximity, visible patience continues',()=>{
 const g=create();assert.equal(g.command({action:'grind'}),'Pick up the empty portafilter and insert it in the grinder first')
 g.command({action:'steam'});g.command({action:'pull',shot:'standard'});run(g,4)
 to(g,'Kitchen');g.command({action:'sandwich'});g.command({action:'press'});run(g,Math.max(cfg.stations.oven,cfg.stations.press))
 assert.equal(g.pot,'standard');assert.equal(g.milk,3);assert.equal(g.ground,0);assert.equal(g.pressState,'ready')
 assert.equal(g.guests[2].state,'ready');assert.ok(g.guests[0].left<g.ticks(cfg.orders[0].patience))
 to(g,'Window');assert.equal(g.guests[2].state,'waiting')
})
test('takeaway accepts food directly and requires the right drink size and lid and pays once across separate handoffs',()=>{
 const g=create();Object.assign(g.data.orders[0],{drink:'americano',food:'brownie',mode:'To go',size:'Large'})
 run(g,3);cook(g,'brownie');g.command({action:'guest',guest:0});assert.equal(g.towel[0],null)
 assert.ok(g.guests[0].gotFood);assert.equal(g.coins,0)
 prepare(g,'americano',true);g.command({action:'lid'});g.command({action:'guest',guest:0});assert.ok(g.cups[0]);g.command({action:'discard'})
 prepare(g,'americano',true,'Large');g.command({action:'guest',guest:0});assert.equal(g.served,0)
 g.command({action:'lid'});g.command({action:'guest',guest:0});const coins=g.coins;assert.ok(coins>0)
 g.command({action:'guest',guest:0});assert.equal(g.served,1);assert.equal(g.coins,coins)
})
test('large iced tea uses two portions and never requires espresso',()=>{
 const g=create();prepare(g,'tea',true,'Large');assert.equal(g.teaStock,cfg.capacity.tea-cfg.capacity.largePortions);assert.equal(g.ground,cfg.capacity.startGround)
})
test('eight-ticket rehearsal completes on both ends and replays identically',()=>{
 const play=()=>{const g=create();g.guests.forEach(v=>v.left=g.ticks(300))
  for(const [i,o] of cfg.orders.entries()){
   to(g,o.end);for(let n=0;n<2400&&g.guests[i].state!=='waiting';n++)g.step();assert.equal(g.guests[i].state,'waiting')
   if(o.drink){prepare(g,o.drink,o.mode==='To go',o.size);if(o.mode==='To go')g.command({action:'lid'});g.command({action:'guest',guest:i})}
   if(o.food){cook(g,o.food);g.command({action:'guest',guest:i})}
   assert.equal(g.served,i+1);run(g,cfg.stations.service)
  }
  assert.ok(g.done);assert.equal(g.expired,0);assert.equal(g.stars,3);return g.events
 };assert.deepEqual(play(),play())
})

test('spent portafilter must be knocked, pre-dosed, purged, attached and locked',()=>{
 const g=create(),cap=g.data.capacity
 g.command({action:'grind'});assert.equal(g.grind,null);assert.equal(g.beans,cap.startBeans)
 for(let n=0;n<cap.basketDoses;n++){
  g.command({action:'pull',shot:'short'});g.command({action:'release'});assert.equal(g.basket,'mounted')
  run(g,g.data.stations.short);assert.equal(g.pot,'short');g.command({action:'trash',target:{kind:'shot',slot:0}})
 }
 g.command({action:'pull',shot:'standard'});assert.equal(g.extraction,null)
 g.command({action:'lock'});g.command({action:'dose'});assert.equal(g.basket,'mounted')
 g.command({action:'release'});assert.equal(g.basket,'released')
 assert.equal(g.command({action:'knock'}),'Pick up the spent portafilter before using the knock box')
 g.command({action:'pick'});assert.equal(g.basket,'held');g.command({action:'knock'});assert.equal(g.basket,'knocking')
 run(g,.95);assert.equal(g.basket,'knocking');run(g,.05);assert.equal(g.basket,'clean')
 g.command({action:'lock'});assert.equal(g.basket,'clean')
 g.command({action:'grind'});assert.equal(g.basket,'clean')
 g.command({action:'pick'});assert.equal(g.basket,'emptyHeld')
 g.command({action:'grind'});assert.equal(g.basket,'grinding');assert.equal(g.grinding,cap.basketDoses)
 run(g,g.data.stations.grinder-.05);assert.equal(g.basket,'grinding');run(g,.05);assert.equal(g.basket,'dosed')
 assert.equal(g.command({action:'lock'}),'Attach the pre-tamped portafilter first')
 g.command({action:'dose'});assert.equal(g.basket,'dosedHeld')
 g.command({action:'attach',head:0});assert.equal(g.basket,'dosedHeld');g.command({action:'purge'});run(g,cfg.stations.purge)
 g.command({action:'attach',head:0});assert.equal(g.basket,'attached');g.command({action:'lock'});assert.equal(g.basket,'locking');run(g,g.data.stations.handleLock)
 assert.equal(g.basket,'mounted');assert.equal(g.pulls,cap.basketDoses);assert.equal(g.ground,0)
 assert.equal(g.beans,cap.startBeans-cap.basketDoses)
})
test('portafilter basket follows shared physical anchors and puck falls inside the bin',()=>{
 const g=create();g.pulls=0;g.command({action:'release'});run(g,cfg.stations.load)
 const rested=portafilterPose(g);assert.ok(Math.abs(rested.x-espressoLayout.resting.x)<.1)
 g.command({action:'pick'});g.command({action:'knock'});run(g,.55)
 const head=portafilterPose(g),puck=knockPuckPosition(g)
 assert.ok(head.angle>2.6,'basket faces down for the knock')
 assert.ok(head.x>450&&head.x<520,'basket lies above the box')
 assert.ok(puck&&puck.y>=744&&puck.y<793,'puck falls into, not outside, the box')
 run(g,.45);assert.equal(g.basket,'clean');assert.equal(knockPuckPosition(g),null)
 g.command({action:'pick'});g.command({action:'grind'});assert.equal(portafilterPose(g).x,espressoLayout.grinder.x)
 run(g,g.data.stations.grinder);assert.equal(portafilterPose(g).x,espressoLayout.grinder.x)
 g.command({action:'purge'});run(g,cfg.stations.purge);g.command({action:'attach',head:0});assert.equal(g.basket,'attached')
})
test('retired tamp commands do not change a loaded portafilter; purge is mandatory',()=>{
 const g=create();g.basket='dosed';g.groups[0].dirty=true
 for(const action of ['tamp','moveToTamp','placeTamp'] as const){assert.match(g.command({action}),/Tamping retired/);assert.equal(g.basket,'dosed')}
 g.command({action:'attach',head:0});assert.equal(g.basket,'dosed');g.command({action:'purge'});run(g,cfg.stations.purge)
 g.command({action:'attach',head:0});assert.equal(g.basket,'attached')
})
test('portrait camera preserves the full scene height, crops horizontally and clamps to ends',()=>{
 const a=cameraOffset(180,390,620),b=cameraOffset(1550,390,620)
 assert.ok(Math.abs(a.scale-620/900)<.001)
 assert.equal(a.offset,0)
 assert.ok(b.offset>900&&b.offset<1600)
 assert.equal(cameraOffset(800,1600,900).offset,0)
})
test('iced takeaway accepts ice before an explicit espresso transfer; clear cup accepts a bare shot',()=>{
 const g=create();g.command({action:'cup',cup:'clear',size:'Medium'})
 g.command({action:'add',add:'ice'});run(g,cfg.stations.finish)
 assert.deepEqual(g.cups[0]?.add,['ice']);assert.equal(g.cups[0]?.shot,null)
 g.command({action:'pull',shot:'standard'});run(g,cfg.stations.standard)
 assert.equal(g.canTransfer(0),true);g.command({action:'pour',slot:0});run(g,cfg.stations.transfer)
 assert.equal(g.cups[0]?.shot,'standard');g.command({action:'add',add:'coldmilk'});run(g,cfg.stations.coldmilk)
 assert.equal(g.recipe(g.cups[0]),'iced')
 g.command({action:'cup',cup:'clear',size:'Small',slot:1});assert.equal(g.cups[1]?.shot,null)
 g.command({action:'trash',target:{kind:'drink',slot:0}});g.command({action:'pull',shot:'standard'});run(g,cfg.stations.standard)
 assert.equal(g.canTransfer(1),true);g.command({action:'pour',slot:1});run(g,cfg.stations.transfer)
 assert.equal(g.cups[1]?.shot,'standard')
})
test('drag-style delivery names the source slot and preserves another staged item',()=>{
 const g=create();prepare(g,'latte');g.command({action:'cup',cup:'demi',slot:1})
 assert.equal(g.canServe(0,'cup',0),true)
 g.command({action:'select',slot:1});g.command({action:'serve',kind:'cup',slot:0,guest:0})
 assert.equal(g.served,1);assert.equal(g.cups[0],null);assert.equal(g.cups[1]?.cup,'demi')
})
test('campaign levels have deterministic order queues and equipment upgrades spend only earned coins',()=>{
 const p=freshProgress();assert.equal(p.unlocked,1);assert.equal(buyUpgrade(p,'grinder'),false)
 completeLevel(p,1,2,120);assert.equal(p.unlocked,2);assert.equal(p.bank,120)
 assert.equal(buyUpgrade(p,'grinder'),true);assert.equal(p.bank,75)
 const a=levelConfig(cfg,2,p.ranks),b=levelConfig(cfg,2,p.ranks)
 assert.deepEqual(a,b);assert.equal(a.orders.length,levels[1].tickets)
 assert.ok(a.stations.grinder<cfg.stations.grinder);assert.equal(a.capacity.startGround,0)
 assert.ok(a.orders.some(o=>o.archetype==='Student'))
})
test('explicit drops preserve saucer, ingredient and inventory identity',()=>{
 const g=create();g.command({action:'steam'});g.command({action:'cup',cup:'glass',slot:1})
 g.command({action:'cup',cup:'mug',slot:1});assert.equal(g.stock.mug,cfg.capacity.ceramic);assert.equal(g.cups[0],null)
 pull(g,'standard');g.command({action:'cup',cup:'mug',slot:0});run(g,4)
 g.command({action:'add',add:'milk',slot:8});assert.equal(g.milk,cfg.capacity.milkBatch);assert.equal(Boolean(g.pour),false)
 g.command({action:'add',add:'milk',slot:1});assert.equal(g.pour?.slot,1);run(g,1)
 g.command({action:'returnCup',cup:'glass',size:'Medium',slot:1});assert.equal(g.recipe(g.cups[1]),'latte')
 g.command({action:'returnCup',cup:'glass',size:'Medium',slot:0});assert.ok(g.cups[0])
 g.command({action:'returnCup',cup:'mug',size:'Medium',slot:0});assert.equal(g.cups[0],null);assert.equal(g.stock.mug,cfg.capacity.ceramic)
})
test('only untouched brownies go back to the food station',()=>{
 const g=create();to(g,'Kitchen');g.command({action:'brownie'});g.command({action:'returnBrownie',slot:0})
 assert.equal(g.towel[0],null);assert.equal(g.waste,0)
 g.command({action:'brownie'})
 g.command({action:'load'});g.command({action:'oven'});run(g,cfg.stations.oven);g.command({action:'oven'});g.command({action:'returnBrownie',slot:1})
 assert.equal(g.towel[1]?.food,'baked')
})

test('all six pitchers retain independent shots across concurrent pulls, transfers, and disposal',()=>{
 const g=create()
 const matrix=()=>g.groups.map(group=>group.pots.slice())
 for(const head of [0,1,2])g.command({action:'pull',shot:head===1?'short':'standard',head,lane:0})
 for(const head of [0,1,2])g.command({action:'pull',shot:'short',head,lane:1})
 assert.deepEqual(g.groups.map(v=>v.pulls),[2,2,2])
 run(g,cfg.stations.standard)
 for(const head of [0,1,2])g.command({action:'pull',shot:head===1?'standard':'short',head,lane:1})
 run(g,cfg.stations.standard)
 assert.deepEqual(matrix(),[['standard','short'],['short','standard'],['standard','short']])
 g.command({action:'pull',shot:'short',head:1,lane:1})
 assert.deepEqual(g.groups.map(v=>v.pulls),[1,1,1])
 cup(g,'clear','Small')
 assert.equal(g.cups[0]?.shot,null)
 g.command({action:'pour',head:1,lane:1,slot:0})
 g.command({action:'pull',shot:'short',head:1,lane:1})
 assert.equal(g.groups[1].extraction,null)
 run(g,2)
 g.command({action:'trash',target:{kind:'shot',head:0,lane:1,slot:0}})
 assert.deepEqual(matrix(),[['standard',null],['short',null],['standard','short']])
 assert.equal(g.cups[0]?.shot,'standard')
 g.command({action:'pull',shot:'short',head:1,lane:1});run(g,cfg.stations.standard)
 assert.deepEqual(matrix(),[['standard',null],['short','short'],['standard','short']])
})
test('invalid pitcher addresses and a detached group leave other groups intact',()=>{
 const g=create()
 g.command({action:'pull',head:2,lane:4,shot:'standard'})
 g.command({action:'pull',head:8,lane:0,shot:'short'})
 assert.deepEqual(g.groups.map(v=>v.pulls),[3,3,3])
 for(let i=0;i<cfg.capacity.basketDoses-1;i++){
  g.command({action:'pull',head:2,lane:0,shot:'short'});run(g,cfg.stations.short)
  g.command({action:'trash',target:{kind:'shot',head:2,lane:0,slot:0}})
 }
 g.command({action:'pull',head:2,lane:1,shot:'short'});run(g,cfg.stations.short)
 g.command({action:'release',head:2})
 g.command({action:'pull',head:2,lane:0,shot:'short'})
 g.command({action:'pull',head:0,lane:0,shot:'short'});run(g,cfg.stations.short)
 assert.deepEqual(g.groups.map(v=>v.pots),[['short',null],[null,null],[null,'short']])
 assert.equal(g.serviceHead,2)
})
test('free mixing preserves early ice and lets players make an unmatched drink',()=>{
 const g=create();cup(g,'mug');g.command({action:'add',add:'ice'});run(g,1)
 assert.equal(g.ice,cfg.capacity.ice-1)
 g.command({action:'refillIce'});run(g,cfg.stations.refillIce);assert.equal(g.ice,cfg.capacity.ice)
 pull(g,'standard');g.command({action:'add',add:'water'});run(g,cfg.stations.water+.8)
 assert.deepEqual(g.cups[0]?.add,['ice','water'])
 assert.equal(g.recipe(g.cups[0]),undefined)
})

test('airy and silky have dedicated stocks and the wand only blocks its own pitcher during a pour',()=>{
 const g=create();cup(g,'demi')
 g.command({action:'steam',texture:'airy'});run(g,cfg.stations.steamer)
 g.command({action:'steam',texture:'silky'})
 g.command({action:'add',add:'foam'});run(g,cfg.stations.steamer)
 assert.deepEqual(g.textures,{airy:2,silky:3})
 assert.deepEqual(g.cups[0]?.add,['foam'])
 pull(g,'standard');assert.equal(g.recipe(g.cups[0]),'macchiato')
 assert.equal(g.milkTank,cfg.capacity.milkTank-2*cfg.capacity.milkBatch)
})
test('tank and fridge conserve milk through exhaustion, double taps and partial restocks',()=>{
 const g=create(),cap=g.data.capacity
 g.milkTank=1;g.command({action:'steam',texture:'airy'});run(g,cfg.stations.steamer)
 assert.equal(g.textures.airy,1);assert.equal(g.milkTank,0)
 g.command({action:'steam',texture:'silky'});assert.equal(g.steam,null)
 const before=g.milkReserve;g.command({action:'refillMilk'});g.command({action:'refillMilk'});run(g,cfg.stations.refillMilk+.8)
 assert.equal(g.milkTank,cap.carton);assert.equal(g.milkReserve,before-cap.carton)
 g.command({action:'refillMilk'});run(g,cfg.stations.refillMilk+.8);assert.equal(g.milkTank,cap.milkTank)
 assert.equal(g.milkReserve+g.milkTank,before)
})
test('only the detached head flushes, and its visible rinse completes before relocking',()=>{
 const g=create();g.groups[1].pulls=0
 g.command({action:'release',head:1});assert.ok(g.groups[1].dirty)
 g.command({action:'purge',head:2});assert.equal(g.groups[2].flush,null)
 g.command({action:'purge'});assert.ok(g.groups[1].flush);assert.equal(g.groups[0].flush,null)
 g.command({action:'pull',head:0,lane:0,shot:'short'});run(g,cfg.stations.short)
 assert.equal(g.groups[1].dirty,false);assert.equal(g.groups[0].pots[0],'short')
})
test('food bin loads are individually animated and cooking needs a separate command',()=>{
 const g=create();g.command({action:'load'});g.command({action:'load'});g.command({action:'sandwich'})
 assert.deepEqual(g.foodFlights.map(f=>[f.food,f.slot]),[['raw',0],['raw',1],['panino',0]])
 run(g,2);assert.equal(g.foodFlights.length,0);assert.equal(g.bake,null);assert.equal(g.pressState,'loaded')
 g.command({action:'oven'});g.command({action:'press'});run(g,Math.max(cfg.stations.oven,cfg.stations.press));assert.equal(g.warm,2);assert.equal(g.pressState,'ready')
})

import {drinkLook} from '../src/counter/drink-look.ts'
test('independent wands finish staggered batches and reserve each portion once',()=>{
 const g=create(),batch=cfg.capacity.milkBatch
 g.command({action:'steam',texture:'silky'});run(g,.8)
 g.command({action:'steam',texture:'airy'});g.command({action:'steam',texture:'airy'})
 assert.equal(g.milkTank,cfg.capacity.milkTank-2*batch)
 run(g,cfg.stations.steamer-.8);assert.equal(g.textures.silky,batch);assert.equal(g.textures.airy,0)
 cup(g,'bowl');g.command({action:'add',add:'milk'});assert.equal(g.milk,batch-1)
 run(g,cfg.stations.finish);assert.equal(g.textures.airy,batch)
})
test('a dry glass of ice has zero liquid and each espresso and milk surface is distinct',()=>{
 const g=create();cup(g,'clear','Small');const c=g.cups[0]!
 c.add=['ice'];assert.deepEqual([drinkLook(c).ice,drinkLook(c).fill],[true,0])
 c.shot='short';c.poured=true;const short=drinkLook(c);c.shot='standard';const standard=drinkLook(c)
 assert.equal(standard.fill,short.fill);assert.notEqual(standard.color,short.color);assert.notEqual(short.surface,standard.surface)
 c.add=['milk'];assert.equal(drinkLook(c).surface,'silky')
 c.add=['foam'];assert.equal(drinkLook(c).surface,'airy')
 c.add=['foam','milk'];assert.equal(drinkLook(c).surface,'mixed')
 c.shot=null;c.poured=false;assert.equal(drinkLook(c).surface,'pure-mixed')
})

test('cup handoff packs only a correct takeaway and pays once',()=>{
 const g=create();Object.assign(g.data.orders[0],{drink:'caramellatte',mode:'To go',size:'Large',food:null})
 run(g,3);prepare(g,'caramellatte',true,'Small')
 g.command({action:'serve',kind:'cup',slot:0,guest:0});assert.equal(g.cups[0]?.lid,false)
 g.command({action:'discard'});prepare(g,'caramellatte',true,'Large')
 assert.equal(g.canServe(0,'cup',0,true),true)
 g.command({action:'serve',kind:'cup',slot:0,guest:0})
 assert.equal(g.delivery?.drink?.lid,true);assert.equal(g.cups[0],null)
 const coins=g.coins;g.command({action:'serve',kind:'cup',slot:0,guest:0});assert.equal(g.coins,coins)
})
test('individual bag stock feeds the same hopper once and preserves the other wrappers',()=>{
 const g=create();g.beans=0;const before=g.bagCounts.slice(),n=g.bags
 g.command({action:'beans',bag:1});g.command({action:'beans',bag:1})
 assert.deepEqual(g.bagCounts,before.map((v,i)=>i===1?v-1:v));assert.equal(g.bags,n-1)
 assert.equal(g.beans,cfg.capacity.hopper)
})
test('mixed chocolate, matcha and cold milk have distinct colors and pouring order does not change the blend',()=>{
 const g=create();cup(g,'clear','Small');const c=g.cups[0]!
 c.add=['matcha','coldmilk'];const green=drinkLook(c).color
 c.add=['cocoa','coldmilk'];const brown=drinkLook(c).color
 c.add=['cocoa','matcha','coldmilk'];const blended=drinkLook(c).color
 assert.notEqual(blended,brown);assert.notEqual(blended,green)
 c.add.reverse();assert.equal(drinkLook(c).color,blended)
})

test('a rapid second drop waits for the exact chosen cup without reaching a replacement',()=>{
 const g=create();cup(g,'clear','Small');g.command({action:'cup',cup:'paper',size:'Small',slot:1})
 g.command({action:'dropPour',pour:{action:'add',add:'ice',slot:0}})
 g.command({action:'dropPour',pour:{action:'add',add:'cocoa',slot:0}})
 run(g,cfg.stations.finish+cfg.stations.syrup+.1);assert.deepEqual(g.cups[0]?.add,['ice','cocoa']);assert.deepEqual(g.cups[1]?.add,[])
 g.command({action:'dropPour',pour:{action:'add',add:'coldmilk',slot:0}})
 g.command({action:'dropPour',pour:{action:'add',add:'caramel',slot:1}})
 g.command({action:'returnCup',slot:1,cup:'paper',size:'Small'});g.command({action:'cup',cup:'paper',size:'Small',slot:1})
 assert.equal(g.pours.length,2);run(g,Math.max(cfg.stations.coldmilk,cfg.stations.syrup)+.1);assert.deepEqual(g.cups[1]?.add,['caramel'])
})

test('breakfast rush supports shared demand, partial service, and a complete eight-guest shift',()=>{
 const g=new Bench(levelConfig(cfg,0,freshProgress().ranks),tuning)
 g.command({action:'load'});g.command({action:'load'});g.command({action:'oven'})
 run(g,g.data.stations.oven);g.command({action:'oven'})
 assert.ok(g.canServe(0,'food',0)&&g.canServe(1,'food',0))
 const before=g.guests[0].left
 g.command({action:'serve',kind:'food',slot:0,guest:0})
 assert.ok(g.guests[0].left>before);assert.equal(g.guests[0].received?.food?.food,'baked')
 assert.equal(g.coins,0);assert.equal(g.guests[0].state,'waiting')
 g.command({action:'oven'});g.command({action:'serve',kind:'food',slot:0,guest:1})
 for(const [i,o] of g.data.orders.entries()){
  if(g.guests[i].state==='paid'||g.guests[i].state==='gone')continue
  to(g,o.end)
  for(let wait=0;g.guests[i].state!=='waiting'&&wait<g.ticks(90);wait++)g.step()
  assert.equal(g.guests[i].state,'waiting')
  if(o.drink){prepare(g,o.drink,o.mode==='To go',o.size);g.command({action:'serve',guest:i,kind:'cup',slot:g.selected})}
  if(o.food&&!g.guests[i].gotFood){cook(g,o.food);g.command({action:'serve',guest:i,kind:'food',slot:g.foodIndex})}
 }
 assert.equal(g.served,8);assert.ok(g.done);assert.equal(g.expired,0)
})
test('breakfast oven allows collection throughout the warning and recovers from an overbaked batch',()=>{
 const g=new Bench(levelConfig(cfg,0,freshProgress().ranks),tuning)
 g.command({action:'load'});g.command({action:'load'});g.command({action:'oven'})
 run(g,g.data.stations.oven+g.data.ovenGrace!-g.data.ovenWarning!)
 assert.ok(g.ovenUrgent);g.command({action:'oven'});assert.equal(g.warm,1)
 run(g,g.data.ovenWarning!);assert.equal(g.overbaked,1);assert.equal(g.warm,0)
 g.command({action:'oven'});assert.equal(g.waste,1);g.command({action:'load'});assert.equal(g.raw,1)
})
test('two saucers can pour independently while a physical milk pitcher stays exclusive',()=>{
 const g=create();g.command({action:'steam'});g.command({action:'steam',texture:'airy'})
 run(g,cfg.stations.steamer);cup(g,'bowl');cup(g,'glass')
 g.command({action:'add',slot:0,add:'milk'});g.command({action:'add',slot:1,add:'milk'})
 assert.equal(g.pours.length,1);assert.equal(g.milk,cfg.capacity.milkBatch-1)
 g.command({action:'add',slot:1,add:'foam'});assert.equal(g.pours.length,2)
 run(g,cfg.stations.finish);assert.deepEqual(g.cups.map(c=>c?.add),[['milk'],['foam']])
})

test('each rack keeps its own bake and pickup time across the counter turn',()=>{
 const g=create()
 g.command({action:'load',slot:1});g.command({action:'oven',slot:1})
 run(g,2);to(g,'Kitchen')
 g.command({action:'load',slot:0});g.command({action:'oven',slot:0})
 run(g,cfg.stations.oven-2)
 assert.deepEqual(g.ovenSlots.map(s=>s.state),['cooking','ready','empty'])
 g.command({action:'oven',slot:1,towelSlot:1})
 assert.equal(g.foodOutputs[0]?.towelSlot,1)
 assert.equal(g.towel[1]?.food,'baked')
 assert.equal(g.ovenSlots[1].state,'empty')
 g.command({action:'oven',slot:1,towelSlot:0});assert.equal(g.towel[0],null)
 to(g,'Window');run(g,2)
 g.command({action:'oven',slot:0,towelSlot:1})
 assert.equal(g.ovenSlots[0].state,'ready')
 g.command({action:'oven',slot:0,towelSlot:0});assert.equal(g.towel.map(f=>f?.food)[0],'baked')
 g.command({action:'trash',target:{kind:'food',slot:0}});assert.equal(g.foodOutputs.length,0)
 g.command({action:'brownie'});assert.equal(g.foodOutputs.length,0)
})

test('two press plates grill concurrently and only the explicitly seasoned and collected panino has pesto',()=>{
 const g=create()
 g.command({action:'sandwich',slot:1});g.command({action:'pesto',slot:1});run(g,cfg.stations.pesto)
 g.command({action:'press',slot:1});run(g,1)
 g.command({action:'sandwich'});g.command({action:'press',slot:0})
 assert.equal(g.pressSlots[0].pesto,false)
 assert.ok(g.pressSlots[1].pesto)
 assert.ok(g.pressSlots[0].cook!.end>g.pressSlots[1].cook!.end)
 to(g,'Kitchen');run(g,cfg.stations.press)
 g.command({action:'press',slot:0,towelSlot:1})
 g.command({action:'press',slot:1,towelSlot:0})
 assert.deepEqual(g.towel.map(f=>f?.food),['pesto','grilled'])
 assert.deepEqual(g.foodOutputs.map(f=>[f.slot,f.towelSlot]),[[0,1],[1,0]])
 g.command({action:'press',slot:1});assert.equal(g.foodOutputs.length,2)
})

test('a neglected press plate burns independently, and clearing counts its waste only once',()=>{
 const data=levelConfig(cfg,0,freshProgress().ranks)
 data.startView='Kitchen'
 const g=new Bench(data,tuning)
 assert.equal(g.view,'Kitchen')
 g.command({action:'sandwich',slot:0});g.command({action:'press',slot:0})
 run(g,data.stations.press+data.pressGrace!-2)
 g.command({action:'sandwich',slot:1});g.command({action:'press',slot:1})
 run(g,2);assert.deepEqual(g.pressSlots.map(s=>s.state),['burnt','cooking'])
 g.command({action:'press',slot:0,towelSlot:1});assert.equal(g.waste,0)
 g.command({action:'press',slot:0});g.command({action:'press',slot:0})
 assert.equal(g.waste,1);assert.equal(g.towel[1],null)
 run(g,data.stations.press);assert.equal(g.pressSlots[1].state,'ready')
})

test('invalid or occupied targets leave the hot line and towel untouched',()=>{
 const g=create()
 for(const slot of [-1,NaN,1.5,99]){g.command({action:'load',slot});g.command({action:'sandwich',slot})}
 assert.equal(g.foodFlights.length,0)
 g.command({action:'load',slot:2});g.command({action:'load',slot:2})
 assert.equal(g.foodFlights.length,1)
 g.command({action:'oven',slot:2,towelSlot:0});assert.equal(g.ovenSlots[2].state,'loaded')
 g.command({action:'oven',slot:2});run(g,cfg.stations.oven)
 for(const towelSlot of [-1,1.5,9])g.command({action:'oven',slot:2,towelSlot})
 assert.equal(g.ovenSlots[2].state,'ready');assert.equal(g.towel.filter(Boolean).length,0)
})

test('lunch opens in the kitchen, supports parallel plain and pesto service, and every ticket can be completed',()=>{
 const g=new Bench(levelConfig(cfg,lunchShift,freshProgress().ranks),tuning)
 assert.equal(g.view,'Kitchen')
 for(const slot of [0,1])g.command({action:'sandwich',slot})
 g.command({action:'pesto',slot:1});run(g,g.data.stations.pesto)
 for(const slot of [0,1])g.command({action:'press',slot})
 run(g,g.data.stations.press)
 for(const slot of [0,1])g.command({action:'press',slot,towelSlot:slot})
 to(g,'Door')
 for(const slot of [0,1])g.command({action:'serve',kind:'food',slot,guest:slot})
 assert.equal(g.served,1);assert.equal(g.guests[1].gotFood,true)
 for(const [i,o] of g.data.orders.entries()){
  if(g.guests[i].state==='paid'||g.guests[i].state==='gone')continue
  to(g,o.end)
  for(let wait=0;g.guests[i].state!=='waiting'&&wait<g.ticks(90);wait++)g.step()
  assert.equal(g.guests[i].state,'waiting')
  if(o.drink){prepare(g,o.drink,o.mode==='To go',o.size);g.command({action:'serve',guest:i,kind:'cup',slot:g.selected})}
  if(o.food&&!g.guests[i].gotFood){
   cook(g,o.food)
   g.command({action:'serve',guest:i,kind:'food',slot:g.foodIndex})
  }
 }
 assert.equal(g.served,g.data.orders.length);assert.ok(g.done);assert.equal(g.waste,0);assert.equal(g.expired,0)
})

test('dragging a panino seats it immediately without a second flight from the bin',()=>{
 const g=create()
 g.command({action:'sandwich',slot:1,dragged:true})
 assert.equal(g.pressSlots[1].state,'loaded')
 assert.equal(g.foodFlights.length,0)
 g.command({action:'press',slot:1})
 run(g,g.data.stations.press)
 g.command({action:'press',slot:1,towelSlot:0,dragged:true})
 assert.equal(g.towel[0]?.food,'grilled')
 assert.equal(g.foodOutputs.length,0)
})

test('a full compactor keeps the dragged item, clears once, and keeps running through a turn',()=>{
 const g=create();g.data.capacity.bin=2
 for(let i=0;i<2;i++){g.command({action:'brownie'});g.command({action:'trash',target:{kind:'food',slot:0}})}
 g.command({action:'brownie'})
 assert.match(g.command({action:'trash',target:{kind:'food',slot:0}}),/full/)
 assert.equal(g.towel[0]?.food,'brownie');assert.equal(g.waste,2)
 g.command({action:'compact'});const cycle=g.compacting
 g.command({action:'compact'});assert.equal(g.compacting,cycle)
 to(g,'Kitchen');g.command({action:'tea'});run(g,g.data.stations.compact)
 assert.equal(g.compacting,null);assert.equal(g.binLoad,0);assert.equal(g.waste,2)
 g.command({action:'trash',target:{kind:'food',slot:0}})
 assert.equal(g.binLoad,1);assert.equal(g.waste,3)
})

test('Caffè in Piazza can serve every guest entirely from the two front counter positions',()=>{
 const g=new Bench(levelConfig(cfg,piazzaShift,freshProgress().ranks),tuning)
 assert.equal(g.view,'Door')
 for(const [i,order] of g.data.orders.entries()){
  to(g,order.end)
  for(let n=0;n<g.ticks(100)&&g.guests[i].state!=='waiting';n++)g.step()
  assert.equal(g.guests[i].state,'waiting')
  if(order.drink){prepare(g,order.drink,order.mode==='To go',order.size,true);g.command({action:'serve',guest:i,kind:'cup',slot:g.selected})}
  if(order.food){
   cook(g,order.food,true)
   g.command({action:'serve',guest:i,kind:'food',slot:g.foodIndex})
  }
 }
 assert.equal(g.served,g.data.orders.length);assert.equal(g.expired,0)
 assert.ok(!g.events.some(e=>e.includes('Turn to Kitchen')))
})
