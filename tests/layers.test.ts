import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {Bench,type Config} from '../src/counter/bench.ts'
import type {Tuning} from '../src/content/model.ts'
import {identity,layerIds,parseLayerMap,serializeLayerMap,previewBench,previewStates,transformLayer} from '../src/counter/layer-overrides.ts'
import {holders,miniRack,beanBags,finishSources,syrupKeys,citrusPress,fridge,stage} from '../src/counter/station-layout.ts'
import {holderTouch} from '../src/counter/cup-rack.ts'
import {cupColumns,stackFrames} from '../src/counter/cup-stack-spec.ts'
import {citrusTouch,frontSupplyTouch,milkTouch,syrupTouch,applianceTouch,type TouchBox} from '../src/counter/touch-layout.ts'
import {frontHot,frontPressPoint} from '../src/counter/hot-appliance.ts'
import {iceSeats,scoopWithIce,icePortions} from '../src/counter/ice-service.ts'
import {canDrop} from '../src/counter/drop-eligibility.ts'
const data=<T>(name:string)=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url),'utf8')) as T
const game=()=>new Bench(data<Config>('counter'),data<Tuning>('tuning'))
const overlap=(a:TouchBox,b:TouchBox)=>Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2
const bounds=(b:TouchBox)=>b.x-b.w/2>=0&&b.x+b.w/2<=stage.w&&b.y-b.h/2>=0&&b.y+b.h/2<=stage.h

test('JSON round trip normalizes sparse transforms, drops identity entries, rejects the plate and unsafe input',()=>{
 const map=parseLayerMap({'citrus':{x:9,scaleY:.9,rotation:-6},'ice':{...identity}})
 assert.deepEqual(map,{citrus:{...identity,x:9,scaleY:.9,rotation:-6}})
 assert.deepEqual(parseLayerMap(JSON.parse(serializeLayerMap(map))),map)
 assert.equal(layerIds.includes('plate'),false)
 for(const bad of [{plate:{x:1}},{'forno-kitchen':{x:2}},{ice:{x:Infinity}},{ice:{scaleX:0}},{ice:{rotation:200}},{ice:{unexpected:1}},JSON.parse('{"__proto__":{"x":1}}')])assert.throws(()=>parseLayerMap(bad))
 assert.equal(new Set(layerIds).size,layerIds.length)
})
test('layer transform uses a center pivot and restores the context even after a draw error',()=>{
 const ops:unknown[][]=[]
 const ctx=new Proxy({}, {get:(_t,k)=>(...args:unknown[])=>ops.push([k,...args])}) as CanvasRenderingContext2D
 assert.throws(()=>transformLayer(ctx,{x:10,y:20,w:30,h:40},{...identity,x:4,y:-3,rotation:90,scaleY:.8},()=>{throw Error('draw')}))
 assert.deepEqual(ops,[['save'],['translate',29,37],['rotate',Math.PI/2],['scale',1,.8],['translate',-25,-40],['restore']])
})
test('state previews are detached snapshots and preserve live inventory, timing, appliances and recipes',()=>{
 const g=game(),before=structuredClone(g)
 const empty=previewBench(g,'ice','empty'),steaming=previewBench(g,'milk/silky','working'),press=previewBench(g,'front/press','ready'),cup=previewBench(g,'empire_latte_glass','empty')
 assert.equal(empty.ice,0);assert.equal(g.ice,6)
 assert.ok(steaming.steamJobs.silky);assert.equal(g.steamJobs.silky,null)
 assert.equal(press.pressSlots[0].state,'ready');assert.equal(g.pressSlots[0].state,'empty')
 assert.equal(cup.stock.glass,0);assert.equal(g.stock.glass,5)
 assert.deepEqual(structuredClone(g),before)
 assert.equal(empty instanceof Bench,true)
 assert.deepEqual(previewStates('espresso'),['current']);assert.ok(previewStates('citrus').includes('working'))
})
test('five dine-in stack positions share one baseline with independent targets and preserved vessel identities',()=>{
 const china=holders.slice(0,5),g=game(),targets=china.map(b=>holderTouch(b))
 assert.equal(new Set(china.map(b=>b.y)).size,1)
 assert.deepEqual(china.map(b=>b.cup),['demi','mug','glass','bowl','tall'])
 for(const [i,b] of china.entries()){const stack=stackFrames(cupColumns[i],g.stock[b.cup],5);assert.equal(stack.length,5);assert.equal(stack[0].y+stack[0].h,b.y);assert.ok(stack.every((p,i)=>i===0||p.y<stack[i-1].y))}
 for(let i=0;i<targets.length;i++){assert.ok(bounds(targets[i]));for(let j=i+1;j<targets.length;j++)assert.equal(overlap(targets[i],targets[j]),false)}
 for(const b of china){g.command({action:'cup',cup:b.cup,size:b.size,slot:0});assert.equal(g.stock[b.cup],4);g.command({action:'returnCup',cup:b.cup,size:b.size,slot:0});assert.equal(g.stock[b.cup],5)}
})
test('mini rack retains exactly two supply actions; press projection and foreground citrus clear neighboring targets',()=>{
 assert.equal(miniRack.length,4);assert.equal(miniRack.filter(p=>p.food===null).length,2)
 assert.deepEqual(miniRack.flatMap(p=>p.food?[p.food]:[]),['raw','panino'])
 const supply=[frontSupplyTouch('raw'),frontSupplyTouch('panino')]
 for(const p of supply){assert.ok(bounds(p));assert.equal(overlap(p,fridge),false)}
 assert.equal(overlap(...supply as [TouchBox,TouchBox]),false)
 const citrus=citrusTouch(),cold={x:finishSources.coldmilk.x,y:finishSources.coldmilk.y-finishSources.coldmilk.h/2,w:58,h:finishSources.coldmilk.h}
 const other=[cold,{x:1348,y:673,w:245,h:69},{x:1497,y:803,w:85,h:66},{x:1595,y:803,w:85,h:66},...syrupKeys.map(syrupTouch)]
 assert.ok(citrusPress.y>700);assert.equal(overlap(citrus.run,citrus.juice),false)
 for(const b of Object.values(citrus)){assert.ok(bounds(b));for(const p of other)assert.equal(overlap(b,p),false)}
 const b=frontHot.press,centerY=b.y+b.h/2
 assert.ok(frontPressPoint(b.x,centerY).y<frontPressPoint(b.x+b.w,centerY).y)
 const plates=applianceTouch('press',b,2).slots;assert.equal(overlap(plates[0],plates[1]),false)
})
test('seated bags and milk pitchers stay registered to their shelves and exclusive touch lanes',()=>{
 assert.ok(beanBags.every(b=>b.y>=171&&b.h===96))
 const a=milkTouch('silky'),b=milkTouch('airy');assert.equal(a.pitcher.y,b.pitcher.y);assert.equal(b.pitcher.x-a.pitcher.x,55)
 assert.equal(overlap(a.pitcher,b.pitcher),false)
})
test('six ice units remove visible layers monotonically; large pours debit two, failed pours never debit, refill restores six',()=>{
 const g=game();assert.equal(g.ice,6)
 for(let n=6;n>0;n--){const before=iceSeats(n,6),after=iceSeats(n-1,6);assert.ok(after.length<before.length);assert.ok(after.every(p=>before.some(q=>q.rank===p.rank&&q.x===p.x&&q.y===p.y)))}
 assert.equal(iceSeats(0,6).length,0);assert.ok(iceSeats(6,6).length>30)
 const pen=new Proxy({}, {get:()=>()=>{}}) as CanvasRenderingContext2D,painted:string[]=[]
 scoopWithIce(pen,k=>painted.push(k),0,0,38,0,1,0,2);assert.equal(painted.filter(k=>k.startsWith('empire_ice_cube_')).length,6)
 assert.equal(icePortions('Large',g.data.capacity.largePortions),2)
 const tick=()=>{for(let i=0;i<g.ticks(g.data.stations.finish)+1;i++)g.step()}
 g.command({action:'cup',cup:'clear',size:'Large',slot:0});g.command({action:'add',add:'ice',slot:0});tick();assert.equal(g.ice,4)
 g.command({action:'add',add:'ice',slot:0});assert.equal(g.ice,4)
 g.command({action:'cup',cup:'glass',size:'Medium',slot:1});g.command({action:'add',add:'ice',slot:1});tick();assert.equal(g.ice,3)
 g.command({action:'refillIce'});assert.equal(g.ice,6)
 const low=game();low.ice=1;low.command({action:'cup',cup:'clear',size:'Large',slot:0});assert.equal(canDrop(low,{kind:'add',add:'ice'},'saucer/0'),false);low.command({action:'add',add:'ice',slot:0});assert.equal(low.ice,1)
})
