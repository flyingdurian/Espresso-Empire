import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {Bench,type Config,type Cup,type Size} from '../src/counter/bench.ts'
import type {Tuning} from '../src/content/model.ts'
import {canDrop} from '../src/counter/drop-eligibility.ts'
import {dropTarget,nearestDrop,type DropRect} from '../src/counter/drop-target.ts'
import {milkTouch,syrupTouch,saucerTouch,towelTouch,shotRackTouch,shotPocketTouch,foodWellTouch,type TouchBox} from '../src/counter/touch-layout.ts'
import {holders,syrupKeys,stage,type Carry} from '../src/counter/station-layout.ts'
import {servicePass,reserveHead} from '../src/counter/service-pass.ts'

// These tests deliberately do not import the Ajv-backed content loader: they
// exercise the same real counter configuration and pure state/DOM adapters.
const read=<T>(name:string):T=>JSON.parse(readFileSync(new URL('../public/data/'+name,import.meta.url),'utf8'))
const make=()=>new Bench(read<Config>('counter.json'),read<Tuning>('tuning.json'))
const rect=(x:number,y:number,w:number,h:number):DropRect=>({left:x,top:y,right:x+w,bottom:y+h})
const bounds=(b:TouchBox)=>rect(b.x-b.w/2,b.y-b.h/2,b.w,b.h)
const intersects=(a:TouchBox,b:TouchBox)=>{const p=bounds(a),q=bounds(b);return p.left<q.right&&q.left<p.right&&p.top<q.bottom&&q.top<p.bottom}
const nominal=333/stage.h
const ingredient:Carry={kind:'add',add:'caramel'}

// Minimal DOM contract fixture for hit ownership, disabled controls, clipping,
// and proximity. It is not a browser or physical touch test.
function fixture(){
 const nodes:Fake[]=[]
 type Fake={dataset:{to?:string};box:DropRect;control:boolean;disabled:boolean;hidden:boolean;visible:boolean;closest:(s:string)=>Fake|null;matches:(s:string)=>boolean;getClientRects:()=>unknown[];getBoundingClientRect:()=>DropRect;querySelectorAll:()=>Fake[]}
 function node(box:DropRect,dest?:string,control=!!dest):Fake{
  const n:Fake={dataset:{to:dest},box,control,disabled:false,hidden:false,visible:true,
   closest:s=>s==='#world'?world:s==='#surface'?frame:s==='[hidden],[inert]'?(n.hidden?n:null):n.control?n:null,
   matches:()=>n.disabled,getClientRects:()=>n.visible?[n.box]:[],getBoundingClientRect:()=>n.box,querySelectorAll:()=>nodes}
  return n
 }
 const frame=node(rect(0,0,100,100)),world=node(rect(0,0,100,100)),neutral=node(rect(0,0,100,100))
 const add=(box:DropRect,dest?:string,control=!!dest)=>{const n=node(box,dest,control);nodes.push(n);return n}
 let hit:Fake|null=neutral
 const doc={elementFromPoint:()=>hit} as unknown as Document
 const resolve=(x:number,y:number,radius=12,usable:(item:Carry,dest:string)=>boolean=()=>true)=>dropTarget(ingredient,x,y,radius,usable,doc)
 return {add,resolve,at:(n:Fake|null)=>{hit=n},neutral,frame}
}
test('exact destination owns the release; incompatible, disabled, and carry-only controls block snapping',()=>{
 const f=fixture(),a=f.add(rect(10,10,10,10),'saucer/0'),b=f.add(rect(22,10,10,10),'saucer/1'),other=f.add(rect(20,10,2,10),undefined,true)
 f.at(a);assert.equal(f.resolve(19,15,12),a)
 assert.equal(f.resolve(19,15,12,(_,d)=>d==='saucer/1'),null)
 a.disabled=true;assert.equal(f.resolve(19,15),null)
 f.at(other);assert.equal(f.resolve(21,15),null)
 f.at(b);assert.equal(f.resolve(23,15,0),b)
 f.at(null);assert.equal(f.resolve(23,15),null)
})
test('neutral snap filters unusable and invisible targets, and mouse radius zero never snaps',()=>{
 const f=fixture(),a=f.add(rect(10,10,10,10),'saucer/0'),b=f.add(rect(26,10,10,10),'saucer/1')
 assert.equal(f.resolve(22,15),a)
 assert.equal(f.resolve(22,15,12,(_,d)=>d==='saucer/1'),b)
 assert.equal(f.resolve(22,15,0),null)
 a.visible=false;b.hidden=true;assert.equal(f.resolve(22,15),null)
 b.hidden=false;f.frame.box=rect(0,0,24,100);assert.equal(f.resolve(22,15),null)
})
test('equal and subpixel ties cancel independent of enumeration order; duplicate guest targets are one destination',()=>{
 const a={target:'a',dest:'saucer/0',rect:rect(0,0,10,10)},b={target:'b',dest:'saucer/1',rect:rect(20,0,10,10)}
 assert.equal(nearestDrop(15,5,12,[a,b]),null)
 assert.equal(nearestDrop(15,5,12,[b,a]),null)
 assert.equal(nearestDrop(15.2,5,12,[a,b]),null)
 assert.equal(nearestDrop(16,5,12,[a,b]),'b')
 assert.equal(nearestDrop(15,5,12,[a,{...b,dest:a.dest}]),'a')
})
test('bin is direct-hit only, including when it is the nearest valid target',()=>{
 const f=fixture(),bin=f.add(rect(10,10,10,10),'bin')
 assert.equal(f.resolve(21,15),null)
 f.at(bin);assert.equal(f.resolve(19,15,12),bin)
 assert.equal(f.resolve(19,15,12,()=>false),null)
})
test('milk steam, pitcher and pour controls have exclusive lane and vertical ownership',()=>{
 const all=[...Object.values(milkTouch('silky')),...Object.values(milkTouch('airy'))]
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)assert.equal(intersects(all[i],all[j]),false)
 for(const part of ['steam','pitcher','pour'] as const){const a=milkTouch('silky')[part],b=milkTouch('airy')[part];assert.ok((bounds(b).left-bounds(a).right)*nominal>=3)}
 const css=readFileSync(new URL('../src/counter/style.css',import.meta.url),'utf8')
 assert.match(css,/\.machine-key\.milk-key,\.machine-key\.milk-label\{min-height:0;margin-top:0\}/)
})
test('all five syrup targets have improved spacing and remain inside the stage',()=>{
 const boxes=syrupKeys.map(syrupTouch);assert.equal(boxes.length,5)
 for(let i=0;i<boxes.length;i++){
  const r=bounds(boxes[i]);assert.ok(r.left>=0&&r.right<=stage.w)
  if(i)assert.ok((r.left-bounds(boxes[i-1]).right)*nominal>=3)
 }
})
test('shot rack, its eight pockets, food wells and occupied towels never intersect either saucer for any vessel',()=>{
 const items=[shotRackTouch(),...Array.from({length:8},(_,i)=>shotPocketTouch(i)),towelTouch(0,2),towelTouch(1,2)]
 for(const section of ['panini','pastries'] as const)for(let i=0;i<servicePass[section].capacity;i++){
  items.push(foodWellTouch(section,i))
 }
 const vessels:[Cup,Size][] = holders.map(h=>[h.cup,h.size]);vessels.push(['paper','Medium'],['clear','Medium'])
 for(let i=0;i<2;i++)for(const c of [null,...vessels.map(([cup,size])=>({cup,size}))])for(const item of items)assert.equal(intersects(saucerTouch(i,c),item),false,JSON.stringify({i,c,item}))
 assert.equal(intersects(towelTouch(0,2),towelTouch(1,2)),false)
 assert.deepEqual([servicePass.shots.capacity,servicePass.panini.capacity,servicePass.pastries.capacity],[8,4,3])
})
test('pour eligibility respects stock, lids, duplicate ingredients and an existing directed-pour queue',()=>{
 const g=make();assert.equal(canDrop(g,ingredient,'saucer/0'),false)
 g.command({action:'cup',cup:'clear',size:'Large',slot:0});assert.equal(canDrop(g,ingredient,'saucer/0'),true)
 g.orangeReserve[3]=1;assert.equal(canDrop(g,{kind:'add',add:'orange'},'saucer/0'),false)
 g.orangeReserve[3]=2;assert.equal(canDrop(g,{kind:'add',add:'orange'},'saucer/0'),true)
 g.command({action:'dropPour',pour:{action:'add',add:'caramel',slot:0}})
 assert.equal(canDrop(g,ingredient,'saucer/0'),false)
 const next:Carry={kind:'add',add:'vanilla'};assert.equal(canDrop(g,next,'saucer/0'),true)
 const events=g.events.length;assert.equal(canDrop(g,next,'saucer/0'),true);assert.equal(g.events.length,events)
 g.command({action:'dropPour',pour:{action:'add',add:'vanilla',slot:0}})
 assert.equal(canDrop(g,{kind:'add',add:'cherry'},'saucer/0'),false)
 for(let i=0;i<g.ticks(g.data.stations.syrup)*2+2;i++)g.step()
 assert.deepEqual(g.cups[0]?.add,['caramel','vanilla']);assert.equal(canDrop(g,next,'saucer/0'),false)
 g.cups[0]!.lid=true;assert.equal(canDrop(g,{kind:'add',add:'cherry'},'saucer/0'),false)
})
test('shot staging respects exact occupied pockets and reserve capacity; reserve shots cannot be re-staged',()=>{
 const g=make(),pot:Carry={kind:'pot',head:0,lane:0};g.groups[0].pots[0]='short'
 g.shotReserve[0]='standard';assert.equal(canDrop(g,pot,'shotPocket/0'),false);assert.equal(canDrop(g,pot,'shotPocket/1'),true)
 assert.equal(canDrop(g,pot,'shotPocket'),true);assert.equal(canDrop(g,{kind:'pot',head:reserveHead,lane:0},'shotPocket/1'),false)
 g.shotReserve.fill('standard');assert.equal(canDrop(g,pot,'shotPocket'),false);assert.equal(g.groups[0].pots[0],'short')
})
test('cups, food, appliances and bin only highlight usable destinations',()=>{
 const demi=holders.findIndex(h=>h.cup==='demi'),other=holders.findIndex(h=>h.cup==='mug')
 const g=make(),holder:Carry={kind:'holder',index:demi},cup:Carry={kind:'cup',slot:0},supply:Carry={kind:'supply',station:'oven'}
 assert.equal(canDrop(g,holder,'saucer/0'),true);g.command({action:'cup',cup:'demi',slot:0})
 assert.equal(canDrop(g,holder,'saucer/0'),false);assert.equal(canDrop(g,cup,'holder/'+demi),true);assert.equal(canDrop(g,cup,'holder/'+other),false)
 assert.equal(canDrop(g,cup,'guest/0'),false);assert.equal(canDrop(g,cup,'bin'),true);g.wastePieces.push(...Array(g.data.capacity.bin).fill('liquid'));assert.equal(canDrop(g,cup,'bin'),false)
 assert.equal(canDrop(g,supply,'oven/0'),true);g.command({action:'load',slot:0});assert.equal(canDrop(g,supply,'oven/0'),false);assert.equal(canDrop(g,supply,'oven/1'),true)
 g.ovenSlots[0].state='ready';const baked:Carry={kind:'bakedSlot',station:'oven',slot:0};assert.equal(canDrop(g,baked,'foodWell/oven'),true);assert.equal(canDrop(g,baked,'foodWell/press'),false)
 g.foodReserve.fill({food:'baked'});assert.equal(canDrop(g,baked,'foodWell/oven'),false);assert.equal(canDrop(g,baked,'towel/0'),true);g.towel[0]={food:'brownie'};assert.equal(canDrop(g,baked,'towel/0'),false)
})
test('guest destination revalidates the actual ready drink, pending pour and guest state',()=>{
 const g=make(),cup:Carry={kind:'cup',slot:0};g.command({action:'cup',cup:'glass',slot:0})
 g.guests[0].state='waiting';assert.equal(canDrop(g,cup,'guest/0'),false)
 g.groups[0].pots[0]='standard';g.textures.silky=1
 const shot:Carry={kind:'pot',head:0,lane:0};assert.equal(canDrop(g,shot,'saucer/0'),true)
 g.command({action:'dropPour',pour:{action:'pour',head:0,lane:0,slot:0}})
 const milk:Carry={kind:'add',add:'milk'};assert.equal(canDrop(g,milk,'saucer/0'),true)
 g.command({action:'dropPour',pour:{action:'add',add:'milk',slot:0}})
 assert.equal(canDrop(g,cup,'guest/0'),false)
 for(let i=0;i<g.ticks(g.data.stations.transfer+g.data.stations.finish)+3;i++)g.step()
 assert.equal(g.recipe(g.cups[0]),'latte');assert.equal(canDrop(g,cup,'guest/0'),true);assert.equal(canDrop(g,cup,'guest/1'),false)
 g.guests[0].state='leaving';assert.equal(canDrop(g,cup,'guest/0'),false)
})
test('hot water accepts the exact staged cup and rejects a second water addition',()=>{
 const g=make();g.command({action:'cup',cup:'paper',size:'Small',slot:1})
 const carry:Carry={kind:'cup',slot:1}
 assert.equal(canDrop(g,carry,'waterSpout'),true);assert.equal(canDrop(g,{kind:'cup',slot:0},'waterSpout'),false)
 g.command({action:'dropPour',pour:{action:'add',add:'water',slot:1}})
 const p=g.pouringAt(1)!;assert.equal(p.end-p.start,g.ticks(6));assert.equal(g.cups[0],null)
 for(let n=0;n<p.returnEnd!;n++)g.step()
 assert.deepEqual(g.cups[1]?.add,['water']);assert.equal(canDrop(g,carry,'waterSpout'),false)
})
