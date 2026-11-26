import type {Cup,Size,Drink} from './bench.ts'
import {cupColumns,lidColumns} from './cup-stack-spec.ts'
import {vessel} from './drink-look.ts'
import {vesselHeight} from './station-layout.ts'
// The legacy mug is intentionally unchanged: no replacement was supplied.
export const activeCupId=(cup:Cup,size:Size)=>cup==='mug'?'mug-empty':(cupColumns.find(s=>s.cup===cup&&(cup!=='paper'&&cup!=='clear'||s.size===size))??cupColumns.find(s=>s.cup===cup))!.id+'_active'
export const activeLidId=(cup:'paper'|'clear')=>lidColumns.find(s=>s.cup===cup)!.id+'_active'
export const activeCupAssets=[...cupColumns.filter(s=>s.cup!=='mug'),...lidColumns].map(s=>s.id+'_active')
export const activeCupPath=(id:string)=>'/empire_cupware/'+id+'.webp'
export const activeShape:typeof vessel={
 demi:{cx:.375,rim:.155,rx:.35,ry:.125,foot:.91,glass:false},
 mug:vessel.mug,
 bowl:{cx:.402,rim:.195,rx:.385,ry:.145,foot:.91,glass:false},
 glass:{cx:.50,rim:.072,rx:.43,ry:.065,foot:.80,glass:true},
 tall:vessel.tall,
 paper:{cx:.50,rim:.069,rx:.46,ry:.063,foot:.94,glass:false},
 clear:{cx:.50,rim:.069,rx:.46,ry:.063,foot:.94,glass:true}
}
export function activeCupGeometry(c:Pick<Drink,'cup'|'size'|'lid'>,x:number,y:number,requestedHeight:number,aspect:number){
 // Stock and served vessels share their proportions. Fixed target widths also keep
 // the same lid diameter on the 8/16 oz pair, while respecting saucer headroom.
 const spec=cupColumns.find(s=>s.cup===c.cup&&(c.cup!=='paper'&&c.cup!=='clear'||s.size===c.size))
 const maxH=requestedHeight
 // Keep the registered body identical before and after lidding. Only the lid is drawn above it.
 const pairWidth=(c.cup==='paper'||c.cup==='clear')?Math.min(...cupColumns.filter(s=>s.cup===c.cup&&s.activeAspect).map(s=>Math.min(s.activeWidth??s.w,vesselHeight(s.cup,s.size)*s.activeAspect!))):Infinity
 const w=Math.min(spec?.activeWidth??requestedHeight*1.07,maxH*aspect,pairWidth),h=w/aspect,shape=activeShape[c.cup]
 return {h,w,shape,cx:x+w*(shape.cx-.5),rx:w*shape.rx,ry:h*shape.ry,rim:y-h+h*shape.rim,foot:y-h+h*shape.foot}
}
/** Paper walls hide their contents. Low liquid and settled ice appear in the overhead view only. */
export function visibleContents(cup:Cup,fill:number){return {ice:cup!=='paper',surface:cup!=='paper'||fill>=.78}}
export function liquidTop(g:ReturnType<typeof activeCupGeometry>,fill:number){
 return g.shape.glass?g.foot-g.ry*.16+(g.rim-g.foot+g.ry*.16)*fill:g.rim+g.ry*(1-fill)*.75
}
