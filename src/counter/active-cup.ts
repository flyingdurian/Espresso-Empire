import type {Cup,Size,Drink} from './bench.ts'
import {cupColumns,lidColumns} from './cup-stack-spec.ts'
import {vessel} from './drink-look.ts'
// The legacy mug is intentionally unchanged: no replacement was supplied.
export const activeCupId=(cup:Cup,size:Size)=>cup==='mug'?'mug-empty':(cupColumns.find(s=>s.cup===cup&&(cup!=='paper'&&cup!=='clear'||s.size===size))??cupColumns.find(s=>s.cup===cup))!.id+'_active'
export const activeLidId=(cup:'paper'|'clear')=>lidColumns.find(s=>s.cup===cup)!.id+'_active'
export const activeCupAssets=[...cupColumns.filter(s=>s.cup!=='mug'),...lidColumns].map(s=>s.id+'_active')
export const activeCupPath=(id:string)=>'/empire_cupware/'+id+'.webp'
export const activeShape:typeof vessel={
 demi:{cx:.342,rim:.145,rx:.31,ry:.125,foot:.91,glass:false},
 mug:vessel.mug,
 bowl:{cx:.365,rim:.15,rx:.33,ry:.13,foot:.91,glass:false},
 glass:{cx:.50,rim:.071,rx:.438,ry:.065,foot:.86,glass:true},
 tall:{cx:.50,rim:.072,rx:.43,ry:.065,foot:.80,glass:true},
 paper:{cx:.50,rim:.062,rx:.426,ry:.052,foot:.93,glass:false},
 clear:{cx:.50,rim:.065,rx:.425,ry:.060,foot:.88,glass:true}
}
export function activeCupGeometry(c:Pick<Drink,'cup'|'size'|'lid'>,x:number,y:number,requestedHeight:number,aspect:number){
 // Keep new art within the existing saucer hitbox. Lids reserve headroom inside it.
 const h=Math.min(requestedHeight*(c.lid?.80:1),requestedHeight*1.07/aspect),w=h*aspect,shape=activeShape[c.cup]
 return {h,w,shape,cx:x+w*(shape.cx-.5),rx:w*shape.rx,ry:h*shape.ry,rim:y-h+h*shape.rim,foot:y-h+h*shape.foot}
}
/** Paper walls hide their contents. Low liquid and settled ice appear in the overhead view only. */
export function visibleContents(cup:Cup,fill:number){return {ice:cup!=='paper',surface:cup!=='paper'||fill>=.78}}
export function liquidTop(g:ReturnType<typeof activeCupGeometry>,fill:number){
 return g.shape.glass?g.foot-g.ry*.16+(g.rim-g.foot+g.ry*.16)*fill:g.rim+g.ry*(1-fill)*.75
}
