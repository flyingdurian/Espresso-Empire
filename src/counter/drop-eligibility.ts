import {stockKey,takeCup,type Bench} from './bench.ts'
import {holders,type Carry} from './station-layout.ts'
import {bayFirst,foodBay,reserveHead} from './service-pass.ts'

/** Read-only preflight. Bench.command remains authoritative, including queued pours.
 * Used for both highlighting and release; never changes selection or inventory. */
export function canDrop(g:Bench,item:Carry,dest:string):boolean{
 if(g.done||g.turn)return false
 const [type,index,...extra]=dest.split('/')
 if(extra.length)return false
 if(type==='foodWell')return item.kind==='bakedSlot'&&index===item.station&&canBank(g,item)
 const i=index===undefined?undefined:Number(index)
 if(i!==undefined&&(!/^\d+$/.test(index!)||!Number.isSafeInteger(i)))return false
 const slots=(station:'oven'|'press')=>station==='oven'?g.ovenSlots:g.pressSlots
 const slotMatches=(station:'oven'|'press',predicate:(s:ReturnType<typeof slots>[number])=>boolean)=>i===undefined?slots(station).some(predicate):!!slots(station)[i]&&predicate(slots(station)[i])
 const potReady=(head:number,lane:number)=>!!g.pitcherBank(head)?.[lane]
 const cup=item.kind==='cup'?g.cups[item.slot]:null
 const food=item.kind==='food'?g.foodAt(item.slot):null
 switch(item.kind){
  case 'supply':return type===item.station&&slotMatches(item.station,s=>s.state==='empty')
  case 'pesto':return type==='press'&&slotMatches('press',s=>s.state==='loaded'&&!s.pesto)
  case 'bakedSlot':return type==='towel'&&i!==undefined&&g.towel[i]===null&&slots(item.station)[item.slot]?.state==='ready'
  case 'pot':{
   if(g.kitchen||!potReady(item.head,item.lane))return false
   if(type==='saucer'&&i!==undefined)return g.canDropPour({action:'pour',head:item.head,lane:item.lane,slot:i})
   if(type==='shotPocket'&&item.head!==reserveHead){
    const free=(p:number)=>g.shotReserve[p]===null&&!g.pouringFrom('transfer',reserveHead,p)
    return i===undefined?g.shotReserve.some((_,p)=>free(p)):free(i)
   }
   return type==='bin'&&i===undefined&&!g.compacting&&g.binLoad<g.data.capacity.bin
  }
  case 'holder':{
   const h=holders[item.index]
   return !g.kitchen&&type==='saucer'&&i!==undefined&&g.cups[i]===null&&!!h&&g.stock[stockKey(h.cup,h.size)]>0&&!(g.drawer&&takeCup(h.cup))
  }
  case 'add':return !g.kitchen&&type==='saucer'&&i!==undefined&&g.canDropPour({action:'add',add:item.add,slot:i})
  case 'cup':{
   if(g.kitchen||!cup)return false
   if(type==='guest'&&i!==undefined)return g.canServe(i,'cup',item.slot,true)
   if(type==='bin'&&i===undefined)return !g.compacting&&g.binLoad<g.data.capacity.bin&&!g.pouringAt(item.slot)
   if(type==='holder'&&i!==undefined){const h=holders[i];return !!h&&cup.cup===h.cup&&cup.size===h.size&&!cup.shot&&!cup.add.length&&!cup.lid&&!g.pouringAt(item.slot)}
   return false
  }
  case 'food':return !!food&&(type==='guest'&&i!==undefined?g.canServe(i,'food',item.slot,true):type==='bin'&&i===undefined?!g.compacting&&g.binLoad<g.data.capacity.bin:type==='brownie'&&i===undefined?g.towel[item.slot]?.food==='brownie':false)
  case 'beans':return !g.kitchen&&type==='grinder'&&i===undefined&&!g.hopperFill&&!g.grind&&!g.beans&&g.bags>0&&g.bagCounts[item.bag]>0
  case 'tamper':return !g.kitchen&&type==='mat'&&i===undefined&&g.basket==='atTamp'
  case 'handle':{
   if(g.kitchen||g.assistedService)return false
   if(type==='knock'&&i===undefined)return g.basket==='released'||g.basket==='held'
   if(type==='grinder'&&i===undefined)return (g.basket==='clean'||g.basket==='emptyHeld')&&!g.hopperFill&&!g.grind&&g.beans>=g.data.capacity.basketDoses
   if(type==='mat'&&i===undefined)return g.basket==='dosed'||g.basket==='dosedHeld'
   return type==='head'&&i===g.serviceHead&&g.basket==='tamped'&&!g.groups[g.serviceHead].dirty
  }
 }
}
function canBank(g:Bench,item:Extract<Carry,{kind:'bakedSlot'}>){
 const slots=item.station==='oven'?g.ovenSlots:g.pressSlots,first=bayFirst(item.station)
 return !g.kitchen&&slots[item.slot]?.state==='ready'&&g.foodReserve.slice(first,first+foodBay(item.station).capacity).some(f=>f===null)
}
