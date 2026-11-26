import {strict as assert} from 'node:assert'
import test from 'node:test'
import {existsSync,readFileSync} from 'node:fs'
import {Bench,stockKey,takeCup,type Config,type LidMaterial} from '../src/counter/bench.ts'
import {drawCupRacks,holderTouch,lidTouch,rackArt} from '../src/counter/cup-rack.ts'
import {cupColumns,lidColumns,stackSpecs,stackFrames,stackCount,stackOffsetRange,safeStackOffset,stackTouch,stackAssetPath,curatedStackParts,stackParts,stackPartPath,exactStockState,stockStatePath,fixedStockFrame,stockStateIds} from '../src/counter/cup-stack-spec.ts'
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
const count=(g:Bench,id:string,held:Carry|null=null)=>{const all=paint(g,held).images;const units=all.filter(p=>p.id===id);if(units.length)return units.length;const parts=all.filter(p=>p.id.startsWith(id+'_'));const exact=parts.find(p=>p.id.startsWith(id+'_stock_'));return exact?Number(exact.id.at(-1)):Math.max(0,parts.length-1)}
function complete(g:Bench,material:LidMaterial,slot=0,size:'Small'|'Large'='Small'){
 // A complete beverage constructed from the actual configured recipe, without changing recipes.
 const [id,r]=Object.entries(g.data.recipes).find(([,r])=>r.travelCup===material)!
 g.command({action:'cup',cup:material,size,slot})
 Object.assign(g.cups[slot]!,{shot:r.shot,add:[...r.add],poured:!!r.shot})
 assert.equal(g.recipe(g.cups[slot]!),id)
 return id
}
test('registered Empire-only raster stack assets cover all requested vessels and retain the legacy mug',()=>{
 assert.equal(stackSpecs.length,11);assert.equal(new Set(stackSpecs.map(s=>s.id)).size,11)
 assert.deepEqual(cupColumns.map(s=>s.cup),['bowl','demi','mug','glass','tall','paper','paper','clear','clear'])
 for(const s of stackSpecs){assert.ok(s.id.startsWith('empire_'));assert.ok(existsSync(new URL('../public'+stackAssetPath(s),import.meta.url)));assert.ok(s.w>0&&s.h>0)}
 assert.ok(cupColumns.filter(s=>takeCup(s.cup)).every(s=>s.orientation==='inverted'&&s.offset>=.06&&s.offset<=.15))
 assert.ok(cupColumns.filter(s=>!takeCup(s.cup)&&s.transparent).every(s=>s.orientation==='upright'&&s.offset>=.15&&s.offset<=.25))
 assert.ok(cupColumns.filter(s=>!takeCup(s.cup)&&!s.transparent).every(s=>s.offset>=.3&&s.offset<=.72))
 assert.ok(lidColumns.every(s=>s.orientation==='upright'&&s.offset>=.15&&s.offset<=.27))
})
test('all stack frames paint bottom-to-top, retain fixed width and never double-paint transparent bands',()=>{
 for(const s of stackSpecs){
  const full=stackFrames(s,5,5)
  assert.equal(full.length,5);assert.equal(full[0].y+full[0].h,s.y)
  assert.equal(stackFrames(s,0,5).length,0);assert.equal(stackFrames(s,99,5).length,5);assert.equal(stackFrames(s,99,99).length,5)
  for(const [i,f] of full.entries()){
   assert.equal(f.w,s.w);assert.equal(f.h,s.h);assert.equal(f.x,s.x-s.w/2)
   if(i)assert.ok(f.y<full[i-1].y)
   if(s.transparent&&s.exposure==='rim'&&i>0)assert.ok(Math.abs(f.visibleTo-full[i-1].visibleFrom)<1e-8)
   else if((s.exposure==='base'||s.transparent&&s.exposure!=='rim')&&i<4)assert.ok(Math.abs(f.visibleFrom-full[i+1].visibleTo)<1e-8)
   else{assert.equal(f.visibleFrom,f.y);assert.equal(f.visibleTo,f.y+f.h)}
  }
  for(let n=1;n<5;n++)assert.deepEqual(stackFrames(s,n,5).map(({visibleFrom,visibleTo,...f})=>f),full.slice(0,n).map(({visibleFrom,visibleTo,...f})=>f))
 }
 const g=game(),render=paint(g)
 for(const s of stackSpecs){
  for(const part of stackParts)assert.ok(existsSync(new URL('../public'+stackPartPath(s,part),import.meta.url)))
  const exact=exactStockState(s,5,s.offset)
  assert.equal(render.images.filter(i=>i.id===s.id||i.id.startsWith(s.id+'_')).length,s.stockHeights?1:s.stackMode==='single'?5:exact?1:6)
  if(exact){assert.ok(existsSync(new URL('../public'+stockStatePath(exact),import.meta.url)));assert.ok(existsSync(new URL('../public'+stockStatePath(exactStockState(s,4,s.offset)!),import.meta.url)));assert.equal(exactStockState(s,5,s.offset+.01),null)}
  for(let n=1;n<=5;n++){
   const pieces=curatedStackParts(s,n,5);assert.equal(pieces.length,n+1);assert.equal(pieces.filter(p=>p.part==='band').length,n-1)
   assert.ok(Math.abs(pieces[0].y+pieces[0].h-s.y)<1e-6)
   for(let i=1;i<pieces.length;i++){assert.equal(pieces[i].w,s.w);assert.ok(Math.abs(pieces[i].y+pieces[i].h-pieces[i-1].y)<1e-6)}
   assert.equal(pieces[0].part,s.orientation==='inverted'?'cap':'body')
  }
 }
 assert.equal(render.clips.length,stackSpecs.filter(s=>s.stackMode==='single'&&!s.stockHeights).length*5)
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
 assert.match(main,/aria-description',stock\+' in rack/);assert.doesNotMatch(main,/n\.title=name\+.*stock/)
 })


test('fixed states paint exactly one complete sprite for every committed count, zero for empty',()=>{
 const fixed=stackSpecs.filter(s=>s.stockHeights)
 assert.equal(fixed.length,8)
 for(const s of fixed){
  const g=game(), heights=s.stockHeights!;assert.equal(heights.length,5)
  assert.ok(heights.every((h,i)=>h>0&&(!i||h>heights[i-1])))
  for(let n=0;n<=5;n++){
   if('size' in s){const column=cupColumns.find(c=>c.id===s.id)!;g.stock[stockKey(column.cup,column.size)]=n}
   else {const lid=lidColumns.find(c=>c.id===s.id)!;g.lidStock[lid.cup]=n}
   const render=paint(g),actual=render.images.filter(p=>p.id===s.id||p.id.startsWith(s.id+'_'))
   const frame=fixedStockFrame(s,n,5)
   assert.deepEqual(actual,n?[frame]:[])
   if(frame){assert.equal(frame.id,s.id+'_stock_'+n);assert.ok(stockStateIds.includes(frame.id));assert.ok(existsSync(new URL('../public'+stockStatePath(frame.id),import.meta.url)));assert.equal(frame.w,s.w);assert.ok(Math.abs(frame.y+frame.h-s.y)<1e-8);const t=stackTouch(s,5);assert.ok(frame.y>=t.y-t.h/2-1e-6&&frame.y+frame.h<=t.y+t.h/2+1e-6)}
  }
  assert.deepEqual(fixedStockFrame(s,99,5),fixedStockFrame(s,5,5));assert.deepEqual(fixedStockFrame(s,5,2),fixedStockFrame(s,2,5))
 }
})
test('each lid style fits both 8 and 16 oz with a shared material inventory and no extra debit',()=>{
 for(const material of ['paper','clear'] as const){
  const g=game(),s=lidColumns.find(v=>v.cup===material)!
  complete(g,material,0,'Small');g.command({action:'lid',material})
  assert.equal(g.cups[0]!.lid,true);assert.equal(g.lidStock[material],4)
  complete(g,material,1,'Large');g.command({action:'lid',material})
  assert.equal(g.cups[1]!.lid,true);assert.equal(g.lidStock[material],3);assert.equal(count(g,s.id),3)
  g.command({action:'lid',material});assert.equal(g.lidStock[material],3)
 }
})


test('the two adjusted ceramics retain width and use authored count-specific nested states',()=>{
 const cap=cupColumns.find(s=>s.cup==='bowl')!,demi=cupColumns.find(s=>s.cup==='demi')!
 assert.equal(cap.w,72*.875);assert.ok(Math.abs(demi.w-50*1.10)<1e-9);assert.ok(cap.w>demi.w)
 for(const s of [cap,demi]){
  assert.equal(s.stackMode,'single');assert.equal(s.orientation,'upright');assert.ok(s.offset>=s.minOffset!)
  const frames=stackFrames(s,5,5);for(let i=1;i<frames.length;i++)assert.ok(frames[i-1].y-frames[i].y>=s.h*s.minOffset!-1e-8)
  assert.equal(exactStockState(s,5,s.offset),null);assert.ok(s.stockHeights);assert.equal(fixedStockFrame(s,5,5)?.id,s.id+'_stock_5')
  assert.equal(safeStackOffset(s,.2),s.minOffset)
  for(let n=0;n<=5;n++){const g=game();g.stock[s.cup]=n;assert.equal(count(g,s.id),n)}
 }
})
test('every painted default and maximum-offset stack stays within its own rack with no adjacent visual or hitbox overlap',()=>{
 const targets=[...cupColumns.map(s=>{
  const b=holders.find(b=>b.cup===s.cup&&b.size===s.size)
  if(!b)throw new Error(`Missing holder for ${s.id}`)
  return holderTouch(b)
 }),...lidColumns.map(s=>lidTouch(s))]
 for(const [i,s] of stackSpecs.entries()){
  const rack=s.x<rackArt.takeaway.x?rackArt.china:rackArt.takeaway
  for(const offset of [s.offset,stackOffsetRange(s).max])for(const f of stackFrames(s,5,5,offset)){
   assert.ok(f.x>=rack.x&&f.x+f.w<=rack.x+rack.w);assert.ok(f.y>=rack.y&&f.y+f.h<=rack.y+rack.h)
   if(offset===s.offset){const t=targets[i];assert.ok(f.x>=t.x-t.w/2-1e-8&&f.x+f.w<=t.x+t.w/2+1e-8);assert.ok(f.y>=t.y-t.h/2-1e-8&&f.y+f.h<=t.y+t.h/2+1e-8)}
  }
  for(const t of targets.slice(i+1))assert.ok(Math.abs(targets[i].x-t.x)>=(targets[i].w+t.w)/2)
 }
})
test('each inverted takeaway pair and its upright lid share an identical registered width',()=>{
 for(const material of ['paper','clear'] as const){const pair=cupColumns.filter(s=>s.cup===material),lid=lidColumns.find(s=>s.cup===material)!;assert.equal(pair.length,2);assert.equal(pair[0].w,pair[1].w);assert.equal(pair[0].w,lid.w);assert.ok(pair[0].h<pair[1].h)}
})

test('refined stack heights retain exclusive hitboxes and requested spacing at every count',()=>{
 const baseline:Record<string,number[]>={
  empire_cappuccino:[40.1707,53.6174,68.5505,85.1741,101.7978],
  empire_demitasse:[44.4853,58.7408,74.2634,93.5876,112.9118],
  empire_paper_8oz:[74.6168,81.6121,88.6075,95.6028,102.5982],
  empire_paper_16oz:[91.378,98.4342,105.4905,112.5467,119.603],
  empire_clear_8oz:[66.8673,73.5189,80.1706,86.8223,93.4741],
  empire_clear_16oz:[89.9182,97.2371,104.556,111.8749,119.1939]
 }
 for(const s of cupColumns.filter(s=>baseline[s.id])){
  const old=baseline[s.id],holder=holders.find(b=>b.cup===s.cup&&b.size===s.size)!,t=holderTouch(holder)
  for(let n=1;n<=5;n++){
   const f=fixedStockFrame(s,n,5)!
   if(s.cup==='bowl')assert.ok(Math.abs(f.h-(old[0]+(old[n-1]-old[0])*1.10))<.0001)
   else if(s.cup==='demi')assert.equal(f.h,old[n-1])
   else if(s.size==='Small')assert.ok(f.h>old[n-1])
   else assert.ok(Math.abs(f.h-old[n-1])<2.5)
   assert.ok(f.y>=t.y-t.h/2-1e-8&&f.y+f.h<=t.y+t.h/2+1e-8)
   assert.ok(Math.abs(f.y+f.h-s.y)<1e-8);assert.equal(f.w,s.w)
  }
 }
 const latte=cupColumns.find(s=>s.id==='empire_latte_glass')!
 assert.equal(latte.offset,.21191406);assert.equal(safeStackOffset(latte),latte.offset)
 const frappe=cupColumns.find(s=>s.id==='empire_frappe_glass')!
 assert.equal(frappe.offset,.2192785);assert.equal(safeStackOffset(frappe),frappe.offset)
 assert.match((latte as typeof latte & {source:string}).source,/sunday_11_frappe_stack_5/);assert.match((frappe as typeof frappe & {source:string}).source,/sunday_11_latte_stack_5/)
 assert.equal(latte.cup,'glass');assert.equal(frappe.cup,'tall');assert.ok(latte.h<frappe.h)
})
test('takeaway fixed rasters add an identical ridge pitch and preserve width for both sizes',()=>{
 for(const material of ['paper','clear'] as const){
  const pair=cupColumns.filter(s=>s.cup===material),[small,big]=pair
  assert.equal(small.stockRidgePixels,big.stockRidgePixels)
  assert.ok(small.stockRidgePixels!>0)
  const dims=(id:string)=>{
   const bytes=readFileSync(new URL('../public'+stockStatePath(id),import.meta.url))
   assert.equal(bytes.toString('ascii',12,16),'VP8L');assert.equal(bytes[20],0x2f)
   const packed=bytes.readUInt32LE(21)
   return {w:(packed&0x3fff)+1,h:((packed>>>14)&0x3fff)+1}
  }
  for(const s of pair){
   const first=dims(s.id+'_stock_1'),pitch=s.stockRidgePixels!
   for(let n=1;n<=5;n++){
    const f=fixedStockFrame(s,n,5)!,d=dims(f.id)
    assert.equal(d.w,256);assert.equal(d.h,first.h+(n-1)*pitch)
    assert.ok(Math.abs(f.h-d.h*s.w/d.w)<.0001)
    assert.equal(f.w,s.w)
   }
  }
  assert.ok(small.stockHeights![0]<big.stockHeights![0]);assert.ok(small.stockHeights![0]>big.stockHeights![0]*.85)
 }
})
