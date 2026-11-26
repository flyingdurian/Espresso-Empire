import type {Carry} from './station-layout.ts'

export type DestinationUsable=(item:Carry,dest:string)=>boolean
export type DropRect={left:number;right:number;top:number;bottom:number}
export type DropCandidate<T>={target:T;dest:string;rect:DropRect}

/** A near miss is assisted only when a single semantic destination wins.
 * Compare CSS-pixel distances, not DOM order; subpixel ties are ambiguous. */
export function nearestDrop<T>(x:number,y:number,radius:number,candidates:DropCandidate<T>[]):T|null{
 if(radius<=0)return null
 const ranked=candidates.filter(c=>c.dest!=='bin').map(c=>({...c,distance:Math.hypot(
  Math.max(0,c.rect.left-x,x-c.rect.right),Math.max(0,c.rect.top-y,y-c.rect.bottom)
 )})).filter(c=>c.distance<radius).sort((a,b)=>a.distance-b.distance)
 const best=ranked[0]
 if(!best||ranked.some(c=>c.dest!==best.dest&&c.distance-best.distance<=.5))return null
 return best.target
}

const control='[data-to],[data-carry],button,input,select,textarea,a[href],[role="button"]'
function enabled(n:HTMLElement,doc:Document){
 if(n.matches(':disabled,[aria-disabled="true"]')||n.closest('[hidden],[inert]'))return false
 const css=doc.defaultView?.getComputedStyle(n)
 return !css||css.visibility!=='hidden'&&css.visibility!=='collapse'&&css.pointerEvents!=='none'&&css.display!=='none'
}

/** Exact ownership wins, even when that control cannot accept the item.
 * Only neutral space inside the world permits proximity assistance. */
export function dropTarget(item:Carry,x:number,y:number,radius:number,usable:DestinationUsable,doc:Document=document){
 const hit=doc.elementFromPoint(x,y)
 if(!hit)return null
 const owner=hit.closest<HTMLElement>(control)
 if(owner){const dest=owner.dataset.to;return dest&&enabled(owner,doc)&&usable(item,dest)?owner:null}
 const world=hit.closest<HTMLElement>('#world')
 if(!radius||!world)return null
 const bounds=world.getBoundingClientRect()
 const frame=world.closest<HTMLElement>('#surface')?.getBoundingClientRect()??bounds
 const candidates:DropCandidate<HTMLElement>[]=[]
 for(const n of world.querySelectorAll<HTMLElement>('[data-to]')){
  const dest=n.dataset.to!
  if(dest==='bin'||!enabled(n,doc)||!usable(item,dest)||!n.getClientRects().length)continue
  const b=n.getBoundingClientRect(),rect={left:Math.max(b.left,bounds.left,frame.left),right:Math.min(b.right,bounds.right,frame.right),top:Math.max(b.top,bounds.top,frame.top),bottom:Math.min(b.bottom,bounds.bottom,frame.bottom)}
  if(rect.right<=rect.left||rect.bottom<=rect.top)continue
  candidates.push({target:n,dest,rect})
 }
 return nearestDrop(x,y,radius,candidates)
}
