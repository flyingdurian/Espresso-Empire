import {strict as assert} from 'node:assert'
import test from 'node:test'
import {existsSync,readFileSync} from 'node:fs'
import {Bench,stockKey,takeCup,type Config,type LidMaterial} from '../src/counter/bench.ts'
import {drawCupRacks,holderTouch,lidTouch,rackArt} from '../src/counter/cup-rack.ts'
import {cupColumns,lidColumns,stackSpecs,stackFrames,stackAssetPath,curatedStackParts,stackParts,stackPartPath,exactStockState,stockStatePath} from '../src/counter/cup-stack-spec.ts'
import {holders,type Carry} from '../src/counter/station-layout.ts'
import type {Tuning} from '../src/content/model.ts'
import {canDrop} from '../src/counter/drop-eligibility.ts'
import {parseLayerMap,previewBench,serializeLayerMap} from '../src/counter/layer-overrides.ts'
const data=<T>(name:string)=>JSON.parse(readFileSync(new URL('../public/data/'+name+'.json',import.meta.url),'utf8')) as T
const game=()=>new Bench(data<Config>('counter'),data<Tuning>('tuning'))
const paint=(g:Bench,held:Carry|null=null)=>{
 const images:{id:string;x:number;y:number;w:number;h:number}[]=[],clips:number[][]=[]
 const ctx={save(){},restore(){},translate(){},scale(){},fillRect(){},beginPath(){},rect(...r:number[]){clips.push(r)},clip(){},createRadialGradient(){return {addColorStop(){}}}}
 drawCupRacks(ctx as unknown as CanvasRenderingContext2D,(id,x,y,w,h)=>images.push({id,x,y,w,h}),()=>{},g,held)
 return {images,clips}
}
const count=(g:Bench,id:string,held:Carry|null=null)=>{const parts=paint(g,held).images.filter(p=>p.id.startsWith(id+'_'));const exact=parts.find(p=>p.id.startsWith(id+'_stock_'));return exact?Number(exact.id.at(-1)):Math.max(0,parts.length-1)}
function complete(g:Bench,material:LidMaterial,slot=0){
 // A complete beverage constructed from the actual configured recipe, without changing recipes.
 const [id,r]=Object.entries(g.data.recipes).find(([,r])=>r.travelCup===material)!
 g.command({action:'cup',cup:material,size:'Small',slot})
 Object.assign(g.cups[slot]!,{shot:r.shot,add:[...r.add],poured:!!r.shot})
 assert.equal(g.recipe(g.cups[slot]!),id)
 return id
}
test('registered Empire-only raster stack assets cover all requested vessels and retain the legacy mug',()=>{
 assert.equal(stackSpecs.length,11);assert.equal(new Set(stackSpecs.map(s=>s.id)).size,11)
 assert.deepEqual(cupColumns.map(s=>s.cup),['demi','mug','glass','bowl','tall','paper','paper','clear','clear'])
 for(const s of stackSpecs){assert.ok(s.id.startsWith('empire_'));assert.ok(existsSync(new URL('../public'+stackAssetPath(s),import.meta.url)));assert.ok(s.w>0&&s.h>0)}
 assert.ok(cupColumns.filter(s=>takeCup(s.cup)).every(s=>s.orientation==='inverted'&&s.offset>=.06&&s.offset<=.15))
 assert.ok(cupColumns.filter(s=>!takeCup(s.cup)&&s.transparent).every(s=>s.orientation==='upright'&&s.offset>=.15&&s.offset<=.25))
 assert.ok(cupColumns.filter(s=>!takeCup(s.cup)&&!s.transparent).every(s=>s.offset>=.3&&s.offset<=.5))
 assert.ok(lidColumns.every(s=>s.orientation==='upright'&&s.offset>=.15&&s.offset<=.27))
})
test('all stack frames paint bottom-to-top, retain fixed width and never double-paint transparent bands',()=>{
 for(const s of stackSpecs){
  const full=stackFrames(s,5,5)
  assert.equal(full.length,5);assert.equal(full[0].y+full[0].h,s.y)
  assert.equal(stackFrames(s,0,5).length,0);assert.equal(stackFrames(s,99,5).length,5)
  for(const [i,f] of full.entries()){
   assert.equal(f.w,s.w);assert.equal(f.h,s.h);assert.equal(f.x,s.x-s.w/2)
   if(i)assert.ok(f.y<full[i-1].y)
   if(s.transparent&&s.exposure==='rim'&&i>0)assert.ok(Math.abs(f.visibleTo-full[i-1].visibleFrom)<1e-8)
   else if(s.transparent&&s.exposure!=='rim'&&i<4)assert.ok(Math.abs(f.visibleFrom-full[i+1].visibleTo)<1e-8)
   else{assert.equal(f.visibleFrom,f.y);assert.equal(f.visibleTo,f.y+f.h)}
  }
  for(let n=1;n<5;n++)assert.deepEqual(stackFrames(s,n,5).map(({visibleFrom,visibleTo,...f})=>f),full.slice(0,n).map(({visibleFrom,visibleTo,...f})=>f))
 }
 const g=game(),render=paint(g)
 for(const s of stackSpecs){
  for(const part of stackParts)assert.ok(existsSync(new URL('../public'+stackPartPath(s,part),import.meta.url)))
  const exact=exactStockState(s,5,s.offset)
  assert.equal(render.images.filter(i=>i.id.startsWith(s.id+'_')).length,exact?1:6)
  if(exact){assert.ok(existsSync(new URL('../public'+stockStatePath(exact),import.meta.url)));assert.ok(existsSync(new URL('../public'+stockStatePath(exactStockState(s,4,s.offset)!),import.meta.url)));assert.equal(exactStockState(s,5,s.offset+.01),null)}
  for(let n=1;n<=5;n++){
   const pieces=curatedStackParts(s,n,5);assert.equal(pieces.length,n+1);assert.equal(pieces.filter(p=>p.part==='band').length,n-1)
   assert.ok(Math.abs(pieces[0].y+pieces[0].h-s.y)<1e-6)
   for(let i=1;i<pieces.length;i++){assert.equal(pieces[i].w,s.w);assert.ok(Math.abs(pieces[i].y+pieces[i].h-pieces[i-1].y)<1e-6)}
   assert.equal(pieces[0].part,s.orientation==='inverted'?'cap':'body')
  }
 }
 assert.equal(render.clips.length,0)
})
test('cancelled holder gestures and rejected pickups retain every cup; successful staging and clean return change exactly one',()=>{
 for(const [i,s] of cupColumns.entries()){
  const g=game(),key=stockKey(s.cup,s.size),held={kind:'holder',index:i} as const
  assert.equal(count(g,s.id,held),5);assert.equal(g.stock[key],5)
  g.command({action:'cup',cup:s.cup,size:s.size,slot:0});assert.equal(g.stock[key],4);assert.equal(count(g,s.id),4)
  assert.equal(canDrop(g,held,'saucer/0'),false)
  g.command({action:'cup',cup:s.cup,size:s.size,slot:0});assert.equal(g.stock[key],4)
  g.command({action:'returnCup',cup:s.cup,size:s.size,slot:0});assert.equal(g.stock[key],5);assert.equal(count(g,s.id),5)
  g.stock[key]=0;g.command({action:'cup',cup:s.cup,size:s.size,slot:0});assert.equal(g.stock[key],0);assert.equal(g.cups[0],null);assert.equal(count(g,s.id),0)
 }
})
test('takeaway cup restocking conserves independent size inventories',()=>{
 const g=game();g.command({action:'cup',cup:'paper',size:'Small',slot:0});g.command({action:'drawer'});g.command({action:'restock',cup:'paper',size:'Small'})
 assert.equal(g.stock['paper-Small'],5);assert.equal(g.reserve['paper-Small'],4);assert.equal(g.stock['paper-Large'],5);assert.equal(g.reserve['paper-Large'],5)
 g.command({action:'returnCup',cup:'paper',size:'Small',slot:0});assert.equal(g.stock['paper-Small'],5);assert.equal(g.reserve['paper-Small'],5)
})
test('lids debit only a successful matching application; duplicates and invalid applications never consume stock',()=>{
 for(const material of ['paper','clear'] as const){
  const g=game(),other=material==='paper'?'clear':'paper',spec=lidColumns.find(s=>s.cup===material)!
  g.command({action:'lid',material});assert.equal(g.lidStock[material],5)
  complete(g,material);g.command({action:'lid',material:other});assert.equal(g.cups[0]!.lid,false);assert.equal(g.lidStock[other],5)
  g.command({action:'lid',material});assert.equal(g.cups[0]!.lid,true);assert.equal(g.lidStock[material],4);assert.equal(count(g,spec.id),4)
  g.command({action:'lid',material});assert.equal(g.lidStock[material],4)
  g.command({action:'drawer'});g.command({action:'restockLid',material});assert.equal(g.lidStock[material],5);assert.equal(g.lidReserve[material],4)
  g.command({action:'restockLid',material});assert.equal(g.lidReserve[material],4)
 }
})
test('automatic takeaway handoff consumes one lid, rejects empty stock, never debits a pre-lidded drink twice',()=>{
 for(const preLid of [false,true]){
  const g=game(),id=complete(g,'paper');const guest=g.guests[0],order=g.data.orders[0]
  Object.assign(order,{end:g.end,drink:id,food:null,mode:'To go',size:'Small'});guest.state='waiting'
  g.lidStock.paper=0;assert.equal(g.canServe(0,'cup',0,true),false);g.command({action:'serve',guest:0,kind:'cup',slot:0});assert.ok(g.cups[0]);assert.equal(g.lidStock.paper,0)
  g.lidStock.paper=1;if(preLid)g.command({action:'lid',material:'paper'})
  assert.equal(g.canServe(0,'cup',0,true),true);g.command({action:'serve',guest:0,kind:'cup',slot:0});assert.equal(g.cups[0],null);assert.equal(g.lidStock.paper,0);assert.equal(g.lidStock.clear,5)
 }
})
test('new stack targets fit their racks and exclude adjacent cup, lid, and reserve drawer targets',()=>{
 const targets=[...holders.map(b=>holderTouch(b)),...lidColumns.map(s=>lidTouch(s))]
 for(const [i,t] of targets.entries()){
  const rack=i<5?rackArt.china:rackArt.takeaway
  assert.ok(t.x-t.w/2>=rack.x&&t.x+t.w/2<=rack.x+rack.w)
  assert.ok(t.y-t.h/2>=rack.y&&t.y+t.h/2<=rack.y+rack.h)
  for(const b of targets.slice(i+1))assert.ok(Math.abs(t.x-b.x)>=(t.w+b.w)/2||Math.abs(t.y-b.y)>=(t.h+b.h)/2)
  if(i>=5)assert.ok(t.y+t.h/2<916-47/2)
 }
})
test('named stack tuner exports offsets, previews detached stock and rejects edits to non-stack/plate layers',()=>{
 const g=game(),map=parseLayerMap({empire_demitasse:{x:3,stackOffset:.4},empire_clear_lid:{stackOffset:.2}})
 assert.deepEqual(parseLayerMap(JSON.parse(serializeLayerMap(map))),map)
 assert.throws(()=>parseLayerMap({ice:{stackOffset:.2}}));assert.throws(()=>parseLayerMap({empire_clear_lid:{stackOffset:0}}));assert.throws(()=>parseLayerMap({plate:{x:1}}))
 assert.equal(previewBench(g,'empire_demitasse','empty').stock.demi,0);assert.equal(previewBench(g,'empire_clear_lid','empty').lidStock.clear,0)
 assert.equal(g.stock.demi,5);assert.equal(g.lidStock.clear,5)
})

test('tall stemmed stock columns and grouped takeaway / lid columns use registered Empire assets and distinct proportions',()=>{
 const latte=cupColumns.find(s=>s.id==='empire_latte_glass')!,frappe=cupColumns.find(s=>s.id==='empire_frappe_glass')!,demi=cupColumns.find(s=>s.id==='empire_demitasse')!
 assert.ok(latte.h>demi.h&&frappe.h>demi.h);assert.equal(latte.exposure,'rim');assert.equal(frappe.exposure,'rim')
 const takeaway=cupColumns.filter(s=>takeCup(s.cup));assert.ok(takeaway.every((s,i)=>!i||s.x>takeaway[i-1].x))
 assert.ok(lidColumns[0].x>takeaway[1].x&&lidColumns[0].x<takeaway[2].x&&lidColumns[1].x>takeaway[3].x);assert.ok(lidColumns.find(s=>s.cup==='clear')!.h>lidColumns.find(s=>s.cup==='paper')!.h)
})

 test('cup and lid hotspots expose stock accessibly without visible count badges',()=>{
 const main=readFileSync(new URL('../src/counter/main.ts',import.meta.url),'utf8')
 const css=readFileSync(new URL('../src/counter/style.css',import.meta.url),'utf8')
 assert.doesNotMatch(main,/china-stock|sleeve-tag/);assert.doesNotMatch(css,/china-stock|sleeve-tag/)
 assert.match(main,/aria-description',stock\+' in rack/)
 })
