import type {Bench} from './bench.ts'
import {servicePass} from './service-pass.ts'
import {syrupKeys,beanBags,stage} from './station-layout.ts'
import {cupColumns,lidColumns,stackSpecs,stackSpec} from './cup-stack-spec.ts'
import {stockKey,takeCup} from './bench.ts'

export type LayerTransform={x:number;y:number;scaleX:number;scaleY:number;rotation:number;stackOffset?:number}
export type LayerMap=Record<string,LayerTransform>
export type PreviewState='current'|'empty'|'full'|'working'|'ready'
export type LayerRect={x:number;y:number;w:number;h:number}
export const identity:LayerTransform={x:0,y:0,scaleX:1,scaleY:1,rotation:0}
export const layerIds=[
 'espresso','grinder','steam','fridge','microwave','bean-fill','brew-plinth','tea-brewer','blender','china-rack','takeaway-rack','syrup-shelf','syrup-rack','supply-boxes',
 ...beanBags.map(b=>b.key),...syrupKeys.map(k=>'syrup/'+k),...['strawberryDrizzle','caramelDrizzle','cinnamonDust','cocoaDust'].map(k=>'topping/'+k),'milk/silky','milk/airy','citrus','mini-rack','cold-milk','ice','front/oven','front/press','rear/oven','rear/press',
 ...Array.from({length:3},(_,i)=>'filter/'+i),'loose-filter',...stackSpecs.map(s=>s.id),'shot-reserve','panini-reserve','pastry-reserve','juice-reserve'
] as const
const known=new Set<string>(layerIds)
export const isLayer=(key:string)=>known.has(key)
export function previewStates(layer:string):PreviewState[]{
 if(layer.startsWith('syrup/'))return ['current','working']
 if(layer==='fridge'||layer==='microwave')return ['current','empty','ready']
 if(stackSpec(layer)||beanBags.some(b=>b.key===layer)||['ice','cold-milk','mini-rack','supply-boxes','shot-reserve','panini-reserve','pastry-reserve','juice-reserve'].includes(layer))return ['current','empty','full','working']
 if(layer.startsWith('milk/')||layer.endsWith('/oven')||layer.endsWith('/press')||['citrus','tea-brewer','blender','loose-filter'].includes(layer))return ['current','empty','full','working','ready']
 return ['current']
}
const limits={x:[-stage.w,stage.w],y:[-stage.h,stage.h],scaleX:[.25,3],scaleY:[.25,3],rotation:[-180,180]} as const
export function parseLayerMap(raw:unknown):LayerMap{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Expected an object keyed by overlay ID')
 const out:LayerMap={}
 for(const [key,value] of Object.entries(raw)){
  if(!isLayer(key))throw Error('Unknown or protected layer: '+key)
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid transform for '+key)
  const next:LayerTransform={...identity}
  for(const [k,v] of Object.entries(value)){
   if(k==='stackOffset'){if(!stackSpec(key)||typeof v!=='number'||!Number.isFinite(v)||v<.05||v>(stackSpec(key)?.minOffset!==undefined?.72:.6))throw Error('Invalid stack offset: '+key);next.stackOffset=v;continue}
   if(!Object.hasOwn(limits,k))throw Error('Unknown transform property: '+k)
   const field=k as keyof typeof limits,[lo,hi]=limits[field]
   if(typeof v!=='number'||!Number.isFinite(v)||v<lo||v>hi)throw Error('Out of range: '+key+'.'+k)
   next[field]=v
  }
  if(next.stackOffset!==undefined||Object.keys(identity).some(k=>next[k as keyof LayerTransform]!==identity[k as keyof LayerTransform]))out[key]=next
 }
 return out
}
export function serializeLayerMap(map:LayerMap){return JSON.stringify(parseLayerMap(map),null,2)}
export function transformLayer(ctx:CanvasRenderingContext2D,rect:LayerRect,offset:LayerTransform|undefined,draw:()=>void){
 if(!offset){draw();return}
 const cx=rect.x+rect.w/2,cy=rect.y+rect.h/2
 ctx.save();try{ctx.translate(cx+offset.x,cy+offset.y);ctx.rotate(offset.rotation*Math.PI/180);ctx.scale(offset.scaleX,offset.scaleY);ctx.translate(-cx,-cy);draw()}finally{ctx.restore()}
}
/** Preview uses a separate snapshot with Bench's methods, never the live stock/clock. */
export function previewBench(game:Bench,layer:string,state:PreviewState):Bench{
 const g=Object.assign(Object.create(Object.getPrototypeOf(game)),structuredClone(game)) as Bench
 g.turn=null
 if(state==='current')return g
 const filled=state==='full'||state==='ready',working=state==='working'
 const cycle=(seconds:number)=>({start:g.tick-Math.round(g.ticks(seconds)*.5),end:g.tick+Math.ceil(g.ticks(seconds)*.5)})
 if(layer==='ice')g.ice=state==='empty'?0:working?Math.floor(g.data.capacity.ice/2):g.data.capacity.ice
 if(layer==='cold-milk')g.milkReserve=state==='empty'?0:working?g.data.capacity.carton:g.data.capacity.carton*g.data.capacity.milkCartons
 if(layer==='fridge')g.fridgeDoor=state==='ready'?cycle(g.data.stations.fridgeDoor):null
 if(layer==='microwave')g.microReady=state==='ready'
 if(layer==='tea-brewer'){g.teaReady=filled;g.brew=working?cycle(g.data.stations.tea):null}
 if(layer==='blender'){g.blendReady=filled;g.blend=working?cycle(g.data.stations.blend):null}
 if(layer==='citrus'){g.orangeDock=filled?g.data.capacity.citrus:0;g.citrus=working?cycle(g.data.stations.citrus):null}
 if(layer.startsWith('milk/')){const texture=layer.slice(5) as 'silky'|'airy';g.textures[texture]=filled?g.data.capacity.milkBatch:0;g.steamJobs[texture]=working?{...cycle(g.data.stations.steamer),amount:g.data.capacity.milkBatch}:null}
 const col=cupColumns.find(s=>s.id===layer);if(col){g.stock[stockKey(col.cup,col.size)]=state==='empty'?0:working?2:takeCup(col.cup)?g.data.capacity.takeaway:g.data.capacity.ceramic}
 const lid=lidColumns.find(s=>s.id===layer);if(lid)g.lidStock[lid.cup]=state==='empty'?0:working?2:g.lidCapacity
 const bag=beanBags.findIndex(b=>b.key===layer);if(bag>=0)g.bagCounts[bag]=state==='empty'?0:2
 if(layer.endsWith('/oven')||layer.endsWith('/press')){
  const oven=layer.endsWith('/oven');g.foodFlights=[]
  for(const slot of oven?g.ovenSlots:g.pressSlots){slot.state=state==='empty'?'empty':working?'cooking':state==='ready'?'ready':'loaded';slot.cook=working?cycle(g.data.stations[oven?'oven':'press']):null;slot.deadline=null;slot.pesto=false}
 }
 if(layer==='loose-filter'){g.basket=state==='empty'?'clean':working?'dosed':'attached';g.assistedService=false;g.basketCycle=null}
 if(layer==='juice-reserve'){g.orangeDock=null;g.orangeReserve.splice(0,4,0,null,null,state==='empty'?null:state==='working'?1:g.data.capacity.citrus)}
 if(layer==='shot-reserve')g.shotReserve.fill(state==='empty'?null:state==='working'?'short':'standard')
 if(layer==='panini-reserve'||layer==='pastry-reserve'){const panini=layer==='panini-reserve';for(let i=0;i<g.foodReserve.length;i++)if((i<servicePass.panini.capacity)===panini)g.foodReserve[i]=state==='empty'?null:{food:panini?'grilled':'baked'}}
 return g
}
