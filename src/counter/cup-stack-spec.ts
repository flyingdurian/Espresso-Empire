import config from '../../public/data/empire_cup_stacks.json' with {type:'json'}
import type {Cup,Size,LidMaterial} from './bench.ts'
export type StackSpec={id:string;label:string;x:number;y:number;w:number;h:number;offset:number;orientation:'upright'|'inverted';transparent:boolean;capFraction:number;exposure?:'rim'}
export type CupColumn=StackSpec&{cup:Cup;size:Size}
export type LidColumn=StackSpec&{cup:LidMaterial}
export const cupColumns=config.columns as CupColumn[]
export const lidColumns=config.lids as LidColumn[]
export const stackSpecs:StackSpec[]=[...cupColumns,...lidColumns]
export const stackSpec=(id:string)=>stackSpecs.find(s=>s.id===id)
export const stackAssetPath=(s:StackSpec)=>'/empire_cupware/'+s.id+'.webp'
export const stackParts=['cap','band','body'] as const
export const stackPartId=(s:StackSpec,part:typeof stackParts[number])=>s.id+'_'+part
export const stackPartPath=(s:StackSpec,part:typeof stackParts[number])=>'/empire_cupware/'+stackPartId(s,part)+'.webp'
/** The curated silhouette is divided into one top, one bottom and repeatable nested bands.
 * Every part is painted once in disjoint vertical regions, without translucent overdraw.
 * Changing offset stretches only the repeat band, never the vessel silhouette. */
export function curatedStackParts(s:StackSpec,count:number,capacity:number,offset=s.offset){
 const n=Math.max(0,Math.min(Math.floor(count),Math.floor(capacity)))
 if(!n)return []
 const cap=s.h*s.capFraction,body=s.h-cap,step=s.h*offset
 const inverted=s.orientation==='inverted'
 const sequence:[typeof stackParts[number],number][]=[inverted?['cap',cap]:['body',body],...Array.from({length:n-1},()=>['band',step] as ['band',number]),inverted?['body',body]:['cap',cap]]
 let bottom=s.y
 return sequence.map(([part,h])=>{bottom-=h;return {id:stackPartId(s,part),part,x:s.x-s.w/2,y:bottom,w:s.w,h}})
}
export type StackFrame={x:number;y:number;w:number;h:number;visibleFrom:number;visibleTo:number}
/** Bottom first; each sprite has constant dimensions. Transparent lower units expose only
 * their non-overlapping exposure band: upright glasses show nested rims above a full base glass; inverted cups and lids show lower bands below a full top unit. */
export function stackFrames(s:StackSpec,count:number,capacity:number,offset=s.offset):StackFrame[]{
 const n=Math.max(0,Math.min(Math.floor(count),Math.floor(capacity)))
 const step=s.h*offset
 return Array.from({length:n},(_,i)=>{
  const y=s.y-s.h-i*step,bottom=y+s.h
  const rim=s.transparent&&s.exposure==='rim'
  return {x:s.x-s.w/2,y,w:s.w,h:s.h,visibleFrom:s.transparent&&!rim&&i<n-1?bottom-step:y,visibleTo:rim&&i>0?y+step:bottom}
 })
}
export function stackTouch(s:StackSpec,capacity:number,w=s.w+6){
 const h=s.h*(1+Math.max(0,capacity-1)*s.offset)+6
 return {x:s.x,y:s.y+3-h/2,w,h}
}

// Exact authored 4/5-state art for the four new dine-in columns. The repeat-band
// renderer remains available for custom offsets and for all smaller stocks.
const exactStockColumns=['empire_demitasse','empire_cappuccino','empire_latte_glass','empire_frappe_glass']
export const stockStateIds=exactStockColumns.flatMap(id=>[4,5].map(n=>id+'_stock_'+n))
export const stockStatePath=(id:string)=>'/empire_cupware/'+id+'.webp'
export function exactStockState(s:StackSpec,count:number,offset:number){return exactStockColumns.includes(s.id)&&(count===4||count===5)&&offset===s.offset?s.id+'_stock_'+count:null}
