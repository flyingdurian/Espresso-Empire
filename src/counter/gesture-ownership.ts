/** Interactive controls own their initial pointer, whether or not they can carry an item.
 * Disabled buttons are included: a swipe over a busy machine is not a counter turn. */
export const interactiveOrigin='[data-carry],[data-to],button,input,select,textarea,a[href],[role="button"],[contenteditable],label,aside,dialog'
export function neutralTravelOrigin(target:Pick<Element,'closest'>|null):boolean{
 return !!target&&!target.closest(interactiveOrigin)
}
export function ownsPointer(owner:{id:number}|null,pointerId:number):boolean{
 return owner!==null&&owner.id===pointerId
}
export function cancelOwnedPointer(owner:{id:number}|null,pointerId:number,cancel:()=>void):boolean{
 if(!ownsPointer(owner,pointerId))return false
 cancel();return true
}
