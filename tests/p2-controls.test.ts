import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {applianceTouch,foodWellTouch,frontSupplyTouch,portafilterTouch,shotKeyTouch,shotPocketTouch,shotRackBezelTouch,shotRackTouch,type TouchBox} from '../src/counter/touch-layout.ts'
import {heads,fridge,stage} from '../src/counter/station-layout.ts'
import {frontHot} from '../src/counter/hot-appliance.ts'
import {rear,rearOven,rearPress} from '../src/counter/rear-layout.ts'
import {chooseShotPocket,servicePass} from '../src/counter/service-pass.ts'
import {cancelOwnedPointer,neutralTravelOrigin} from '../src/counter/gesture-ownership.ts'
import {counterTravel,type Area} from '../src/counter/counter-travel.ts'

const bounds=(b:TouchBox)=>({l:b.x-b.w/2,r:b.x+b.w/2,t:b.y-b.h/2,b:b.y+b.h/2})
const overlap=(a:TouchBox,b:TouchBox)=>{const p=bounds(a),q=bounds(b);return Math.min(p.r,q.r)-Math.max(p.l,q.l)>1e-8&&Math.min(p.b,q.b)-Math.max(p.t,q.t)>1e-8}
const contains=(a:TouchBox,b:TouchBox)=>{const p=bounds(a),q=bounds(b);return q.l>=p.l-1e-8&&q.r<=p.r+1e-8&&q.t>=p.t-1e-8&&q.b<=p.b+1e-8}
const disjoint=(boxes:TouchBox[])=>{for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.equal(overlap(boxes[i],boxes[j]),false,JSON.stringify([boxes[i],boxes[j]]))}
const scale=333/stage.h
const source=(name:string)=>readFileSync(new URL('../src/counter/'+name,import.meta.url),'utf8')

test('shot buttons and portafilter grips are mutually exclusive in desktop and compact layouts',()=>{
 for(const compact of [false,true]){
  const all=heads.flatMap((_,i)=>[shotKeyTouch(i,'short',compact),shotKeyTouch(i,'standard',compact),portafilterTouch(i)])
  disjoint([...all,{x:49,y:466,w:48,h:44},{x:480,y:466,w:44,h:44}])
  for(let i=0;i<heads.length;i++){
   const standard=bounds(shotKeyTouch(i,'standard',compact)),grip=bounds(portafilterTouch(i))
   assert.ok((grip.t-standard.b)*scale>=2.5)
   if(compact){assert.deepEqual(shotKeyTouch(i,'standard',true),shotKeyTouch(i,'standard'));assert.deepEqual(shotKeyTouch(i,'short',true),shotKeyTouch(i,'short'));assert.ok(bounds(shotKeyTouch(i,'standard',true)).l-bounds(shotKeyTouch(i,'short',true)).r>=4)}
  }
 }
 const css=source('style.css'),main=source('main.ts')
 assert.match(css,/\.machine-key\.shot-key\{[^}]*top:var\(--shot-top\)!important;[^}]*height:var\(--shot-height\)!important;min-height:0;[^}]*margin-top:0/)
 assert.match(main,/const b=shotKeyTouch\(h,type\),compact=shotKeyTouch\(h,type,true\)/)
 assert.match(main,/const gripBox=portafilterTouch\(h\)/)
})
test('all reserve pocket and well retrieval rectangles have neutral internal gaps and retain capacities',()=>{
 const shot=Array.from({length:servicePass.shots.capacity},(_,i)=>shotPocketTouch(i))
 const panini=Array.from({length:servicePass.panini.capacity},(_,i)=>foodWellTouch('panini',i))
 const pastries=Array.from({length:servicePass.pastries.capacity},(_,i)=>foodWellTouch('pastries',i))
 assert.deepEqual([shot.length,panini.length,pastries.length],[8,4,3])
 disjoint([...shot,...panini,...pastries,...shotRackBezelTouch()])
 for(const [cells,columns] of [[shot,4],[panini,2],[pastries,1]] as const){
  for(let i=0;i<cells.length;i++){
   if(i%columns!==columns-1&&i+1<cells.length)assert.ok(bounds(cells[i+1]).l-bounds(cells[i]).r>=4-1e-8)
   if(i+columns<cells.length)assert.ok(bounds(cells[i+columns]).t-bounds(cells[i]).b>=4-1e-8)
  }
 }
 for(const box of [...shot,...shotRackBezelTouch()])assert.ok(contains(shotRackTouch(),box))
})
test('explicit shot selection never falls through to a different pocket; only generic rack chooses first-free',()=>{
 const free=(i:number)=>[false,true,false,true,false,false,false,false][i]===true
 assert.equal(chooseShotPocket(8,free,0),-1)
 assert.equal(chooseShotPocket(8,free,1),1)
 assert.equal(chooseShotPocket(8,free,3),3)
 assert.equal(chooseShotPocket(8,free),1)
 assert.equal(chooseShotPocket(8,free,8),-1)
 assert.equal(chooseShotPocket(8,free,-1),-1)
 assert.equal(chooseShotPocket(8,free,1.5),-1)
 assert.equal(chooseShotPocket(8,()=>false),-1)
 assert.match(source('main.ts'),/chooseShotPocket\(g\.shotReserve\.length,free,preferred\)/)
})
test('front and rear appliance slots and generic bezels have no shared ownership',()=>{
 for(const [station,box,count] of [['oven',frontHot.oven,3],['press',frontHot.press,2],['oven',rearOven,3],['press',rearPress,2]] as const){
  const {slots,bezel}=applianceTouch(station,box,count),outer={x:box.x+box.w/2,y:box.y+box.h/2,w:box.w,h:box.h}
  assert.equal(slots.length,count);assert.ok(bezel.length>=2)
  disjoint([...slots,...bezel]);for(const b of [...slots,...bezel])assert.ok(contains(outer,b))
  for(let i=1;i<count;i++){
   const a=bounds(slots[i-1]),b=bounds(slots[i]),gap=station==='oven'?b.t-a.b:b.l-a.r
   assert.ok(gap>=6-1e-8)
   const x=station==='oven'?slots[i].x:(a.r+b.l)/2,y=station==='oven'?(a.b+b.t)/2:slots[i].y
   assert.ok(!bezel.some(p=>contains(p,{x,y,w:.1,h:.1})))
  }
 }
})
test('supply targets are separated from all appliance slots and bezels, and front fridge',()=>{
 const boxes=(station:'oven'|'press',box:typeof rearOven,count:number)=>{const g=applianceTouch(station,box,count);return [...g.slots,...g.bezel]}
 disjoint([frontSupplyTouch('raw'),frontSupplyTouch('panino'),fridge,...boxes('oven',frontHot.oven,3),...boxes('press',frontHot.press,2)])
 disjoint([rear.load,rear.sandwich,...boxes('oven',rearOven,3),...boxes('press',rearPress,2)])
 assert.ok(bounds(rear.load).t-(rearOven.y+rearOven.h)>=10)
 assert.ok(bounds(rear.sandwich).t-(rearPress.y+rearPress.h)>=10)
})

// Minimal event fixture executes the real travel handlers, not a second gesture algorithm.
const origin=(selector:string|null)=>({closest:(s:string)=>selector&&s.split(',').includes(selector)?{}:null}) as unknown as Element
function travelFixture(){
 const listeners=new Map<string,((e:any)=>void)[]>(),captured:number[]=[],turns:Area[]=[]
 const surface={clientWidth:600,classList:{add(){},remove(){}},setPointerCapture:(id:number)=>captured.push(id),addEventListener:(type:string,fn:(e:any)=>void)=>{const list=listeners.get(type)??[];list.push(fn);listeners.set(type,list)}} as unknown as HTMLElement
 const prior=Object.getOwnPropertyDescriptor(globalThis,'window')
 Object.defineProperty(globalThis,'window',{configurable:true,value:{addEventListener(){}}})
 let blocked=false
 let travel:ReturnType<typeof counterTravel>
 try{travel=counterTravel(surface,()=> 'Door',()=>blocked,to=>turns.push(to))}finally{if(prior)Object.defineProperty(globalThis,'window',prior);else Reflect.deleteProperty(globalThis,'window')}
 const emit=(type:string,extra:Record<string,unknown>={})=>{for(const fn of listeners.get(type)??[])fn({type,isPrimary:true,button:0,pointerId:1,clientX:300,clientY:100,timeStamp:0,target:origin(null),...extra})}
 return {travel,emit,captured,turns,setBlocked:(v:boolean)=>{blocked=v}}
}
test('counter travel rejects non-carry controls, nested control origins, disabled buttons, and secondary starts',()=>{
 for(const selector of ['button','[data-to]','[data-carry]','[role="button"]','aside','dialog','input','label']){
  assert.equal(neutralTravelOrigin(origin(selector)),false)
  const f=travelFixture();f.emit('pointerdown',{target:origin(selector)});f.emit('pointermove',{clientX:120,timeStamp:50});f.emit('pointerup',{clientX:120,timeStamp:60})
  assert.deepEqual(f.captured,[]);assert.deepEqual(f.turns,[])
 }
 const f=travelFixture();f.emit('pointerdown',{isPrimary:false});f.emit('pointermove',{clientX:120});f.emit('pointerup',{clientX:120});assert.deepEqual(f.turns,[])
 f.setBlocked(true);f.emit('pointerdown');f.emit('pointermove',{clientX:120});f.emit('pointerup',{clientX:120});assert.deepEqual(f.turns,[])
})
test('neutral counter swipe still commits; secondary leave and cancel do not steal its pointer',()=>{
 const f=travelFixture();assert.equal(neutralTravelOrigin(origin(null)),true)
 f.emit('pointerdown');f.emit('pointerleave',{pointerId:2});f.emit('pointercancel',{pointerId:2});f.emit('pointerdown',{pointerId:2})
 f.emit('pointermove',{clientX:120,timeStamp:60});assert.deepEqual(f.captured,[1]);assert.equal(f.travel.frame(undefined)?.to,'Window')
 f.emit('pointercancel',{pointerId:2});f.emit('pointerup',{clientX:120,timeStamp:100});assert.deepEqual(f.turns,['Window'])
})
test('owned counter cancellation and lost capture settle without committing a turn',()=>{
 for(const event of ['pointercancel','lostpointercapture']){
  const f=travelFixture();f.emit('pointerdown');f.emit('pointermove',{clientX:120,timeStamp:50});f.emit(event,{clientX:120,timeStamp:60});f.emit('pointerup',{clientX:120,timeStamp:100});assert.deepEqual(f.turns,[])
 }
})
test('item and header cancellation only invoke teardown for the owning pointer',()=>{
 let called=0;const abort=()=>{called++},primary={id:41}
 assert.equal(cancelOwnedPointer(null,41,abort),false)
 assert.equal(cancelOwnedPointer(primary,42,abort),false)
 assert.equal(called,0)
 assert.equal(cancelOwnedPointer(primary,41,abort),true);assert.equal(called,1)
 const main=source('main.ts')
 assert.match(main,/app\.addEventListener\('pointercancel',e=>\{cancelOwnedPointer\(drag,e\.pointerId,abortGesture\)\}\)/)
 assert.match(main,/app\.addEventListener\('lostpointercapture',e=>\{cancelOwnedPointer\(drag,e\.pointerId,abortGesture\)\}\)/)
 assert.match(main,/if\(drag\|\|paused\|\|g\.turn\|\|!e\.isPrimary\|\|e\.button!==0\)return/)
 assert.match(main,/strip\.addEventListener\('pointercancel',e=>\{cancelOwnedPointer\(navDrag,e\.pointerId,cancelNav\)\}\)/)
})
