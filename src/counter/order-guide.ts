import {takeCup, type Bench, type Drink, type Recipe} from './bench.ts'
/** Stable ticket numbers, including guests at the other counter awaiting acknowledgement. */
export const activeOrderIds=(g:Bench)=>g.guests.flatMap((v,i)=>['ready','waiting'].includes(v.state)?[i]:[])
export const orderNumber=(i:number)=>i+1
export function orderRecipe(g:Bench,i:number):Recipe|null{
 const o=g.data.orders[i],r=o?.drink?g.data.recipes[o.drink]:null
 return r?{...r,add:[...r.add,...(o.toppings??[])]}:null
}
/** One selected, compatible cup only. Never combine ingredients from two saucers. */
export function ingredientProgress(g:Bench,i:number|undefined,r:Recipe,c:Drink|null){
 const o=i===undefined?undefined:g.data.orders[i],cup=o?(o.mode==='To go'?r.travelCup:r.cup):null
 const vessel=!!c&&(cup?c.cup===cup&&c.size===o!.size:(c.cup===r.cup||c.cup===r.travelCup))
 const valid=vessel&&(!c!.shot||c!.shot===r.shot)&&c!.add.every(a=>r.add.includes(a))
 return {vessel,coffee:!!valid&&!!c!.poured&&c!.shot===r.shot,adds:r.add.map(a=>!!valid&&c!.add.includes(a))}
}
