import {servicePass,reserveHead,foodBay,bayFirst,passFoodCount} from './service-pass.ts'
import {nextRandom} from '../sim/random.ts'
import type {Tuning} from '../content/model.ts'

export type End='Door'|'Window'
export type Cup='demi'|'mug'|'glass'|'bowl'|'tall'|'paper'|'clear'
export type Size='Small'|'Medium'|'Large'
export type Food='brownie'|'baked'|'grilled'|'pesto'
export type Mode='Dine in'|'To go'
export type Shot='short'|'standard'
export type Texture='airy'|'silky'
export type Add='milk'|'water'|'cold'|'foam'|'ice'|'coldmilk'|'tea'|'cocoa'|'matcha'|'caramel'|'vanilla'|'cherry'|'orange'
export type Station='knock'|'handleTravel'|'handleLock'|'grinder'|'steamer'|'oven'|Shot|'transfer'|'finish'|'load'|'service'|'turn'|'entrance'|'departure'|'press'|'tea'|'blend'|'lid'|'compact'|'wash'|'dishReturn'|'microwave'|'purge'|'foodFlight'|'refillMilk'|'fridgeDoor'|'citrus'
export type Recipe={name:string;cup:Cup;travelCup:Cup;shot:Shot|null;add:Add[];price:number}
export type Order={end:End;spot:number;look:string;name:string;mode:Mode;size:Size;drink:string|null;food:Food|null;after:number;patience:number;archetype?:'Regular'|'Student'|'Remote worker'|'Tourist'|'Critic';tipMultiplier?:number}
export type Config={startView?:End|'Kitchen';seed:number;tickMs:number;stations:Record<Station,number>;capacity:{milkTank:number;carton:number;milkCartons:number;finishPortions:number;bin:number;heads:number;pitchers:number;ice:number;hopper:number;startBeans:number;basketDoses:number;beanBags:number;startGround:number;grindBatch:number;milkBatch:number;oven:number;press:number;saucers:number;towel:number;citrus:number;tea:number;blend:number;largePortions:number;ceramic:number;takeaway:number;reserve:number;wash:number};
 cups:Record<Cup,string>;finishes:Record<Add,string>;foods:Record<Food,{name:string;price:number}>;recipes:Record<string,Recipe>;orders:Order[];partialRelief?:number;ovenGrace?:number;pressGrace?:number;ovenWarning?:number;jitterSeconds:number}
export type Drink={uid:number;cup:Cup;size:Size;shot:Shot|null;add:Add[];poured:boolean;lid:boolean;placed:number}
export type Serving={food:Food}
export const takeCup=(cup:Cup)=>cup==='paper'||cup==='clear'
type Guest={received:Delivery|null;gotDrink:boolean;gotFood:boolean;state:'queued'|'joining'|'line'|'walking'|'ready'|'waiting'|'paid'|'leaving'|'gone';fromLine:boolean;since:number;left:number;arrival:number}
type Cycle={start:number;end:number}
export type HotBay='oven'|'press'
export type HotSlot={state:'empty'|'loaded'|'cooking'|'ready'|'burnt';since:number;cook:Cycle|null;deadline:number|null;pesto:boolean;pestoAt?:number}
type KitchenOutput=Cycle&{station:HotBay;slot:number;towelSlot:number;food:Food;item:Serving}
const emptyHotSlot=(tick:number):HotSlot=>({state:'empty',since:tick,cook:null,deadline:null,pesto:false})
type Pour=Cycle&{slot:number;action:'transfer'|Add;head?:number;lane?:number}
export type Delivery=Cycle&{guest:number;slot:number;drink:Drink|null;food:Serving|null}
export const sizes:Size[]=['Small','Medium','Large']
export const stockKey=(cup:Cup,size:Size='Medium')=>takeCup(cup)?cup+'-'+size:cup
export type WasteTarget={kind:'drink'|'food'|'shot';slot:number;head?:number;lane?:number}
export type Basket='mounted'|'released'|'held'|'knocking'|'clean'|'emptyHeld'|'grinding'|'dosed'|'dosedHeld'|'atTamp'|'tamping'|'tamped'|'locking'
export type Group={dirty:boolean;flush:Cycle|null;pulls:number;pots:(Shot|null)[];extraction:(Cycle&{shot:Shot;lane:number})|null}
type DirectedPour={action:'add';slot:number;add:Add}|{action:'pour';slot:number;head:number;lane:number}
export type Input={action:'parkShot';head:number;lane:number;pocket:number}|{action:'bankHot';station:HotBay;slot?:number;dragged?:boolean}|{action:'serviceGroup';head:number}|{action:'grinderLever'}|{action:'dropPour';pour:DirectedPour}|{action:'purge';head?:number}|{action:'steam';texture?:Texture}|{action:'refillMilk'}|{action:'beans';bag?:number}|{action:'releaseKnock'|'pick'|'knock'|'dose'|'placeTamp'|'moveToTamp'|'tamp'|'lock'}|{action:'release';head?:number}|{action:'refillIce'|'heat'}|{action:'returnCup';slot:number;cup:Cup;size:Size}|{action:'returnBrownie';slot:number}|{action:'trash';target:WasteTarget}|{action:'restock';cup:Cup;size:Size}|{action:'drawer'|'washLoad'|'washRun'}|{action:'pull';shot:Shot;head?:number;lane?:number}|{action:'cup';cup:Cup;size?:Size;slot?:number}|{action:'add';add:Add;slot?:number}|{action:'select'|'food';slot:number}|{action:'guest';guest:number}|{action:'serve';guest:number;kind:'cup'|'food';slot:number}|{action:'pour';slot?:number;head?:number;lane?:number}|{action:'to';view:End|'Kitchen'}|{action:'load'|'sandwich'|'pesto';slot?:number;dragged?:boolean}|{action:HotBay;slot?:number;towelSlot?:number;dragged?:boolean}|{action:'grind'|'discard'|'lid'|'compact'|'brownie'|'tea'|'blend'|'citrus'}
export class Bench{
 data:Config;tuning:Tuning;tick=0;age=0;started=false;end:End='Door';kitchen=false;turn:(Cycle&{to:End|'Kitchen'})|null=null;seed:number
 groups:Group[];serviceHead=0;ice:number;microwave:Cycle|null=null;microReady=false
 get pulls(){return this.groups[this.serviceHead].pulls} set pulls(n:number){this.groups[this.serviceHead].pulls=n}
 assistedService=false
 bagCounts:number[];basket:Basket='mounted';bags:number;basketMoved=-1000;basketCycle:Cycle|null=null
 fridgeDoor:Cycle|null=null;milkTank:number;milkReserve:number;milkRefill:(Cycle&{amount:number})|null=null
 textures:Record<Texture,number>={silky:0,airy:0}
 steamJobs:Record<Texture,(Cycle&{amount:number})|null>={silky:null,airy:null}
 get steam(){return this.steamJobs.silky??this.steamJobs.airy}
 get milk(){return this.textures.silky}
 foodFlights:(Cycle&{food:'raw'|'panino';slot:number})[]=[]
 beans:number;ground:number;grind:Cycle|null=null;grinding=0
 hopperFill:Cycle|null=null;ovenDoor:Cycle|null=null;loading:Cycle|null=null
 readonly ovenSlots:HotSlot[];readonly pressSlots:HotSlot[]
 private outputFlights:KitchenOutput[]=[]
 get foodOutputs(){return this.outputFlights.filter(job=>this.foodAt(job.towelSlot)===job.item)}
 get raw(){return this.ovenSlots.filter(slot=>slot.state==='loaded'||slot.state==='cooking').length}
 get warm(){return this.ovenSlots.filter(slot=>slot.state==='ready').length}
 get overbaked(){return this.ovenSlots.filter(slot=>slot.state==='burnt').length}
 get bake(){return this.ovenSlots.find(slot=>slot.cook)?.cook??null}
 get press(){return this.pressSlots.find(slot=>slot.cook)?.cook??null}
 get pressState(){return this.pressSlots.find(slot=>slot.state!=='empty')?.state??'empty'}
 get ovenUrgent(){return this.ovenSlots.some(slot=>this.hotUrgent(slot))}
 hotUrgent(slot:HotSlot){return slot.deadline!==null&&slot.deadline-this.tick<=this.ticks(this.data.ovenWarning??0)}
 get extraction(){return this.groups[0].extraction} get pot(){return this.groups[0].pots[0]}
 readonly shotReserve:(Shot|null)[]=Array(servicePass.shots.capacity).fill(null)
 readonly stagedShotMotion=new Map<number,Cycle&{head:number;lane:number}>()
 readonly foodReserve:(Serving|null)[]=Array(passFoodCount).fill(null)
 pitcherBank(head:number){return head===reserveHead?this.shotReserve:this.groups[head]?.pots}
 foodAt(slot:number){return slot<this.towel.length?this.towel[slot]:this.foodReserve[slot-this.towel.length]}
 private takeFood(slot:number){
  const from=slot<this.towel.length?this.towel:this.foodReserve
  const i=slot<this.towel.length?slot:slot-this.towel.length
  const item=from[i];if(item)from[i]=null
  return item
 }
 private stageHot(station:HotBay,slot?:number,dragged=false){
  const first=bayFirst(station),end=first+foodBay(station).capacity
  const pocket=this.foodReserve.findIndex((item,i)=>i>=first&&i<end&&!item)
  if(pocket<0)return station==='oven'?'Pastry well is full':'Panini well is full'
  return this.operateHot(station,slot,this.towel.length+pocket,dragged)
 }
 readonly pours:Pour[]=[]
 private readonly pending=new Map<number,{uid:number;command:DirectedPour}>()
 get pour(){return this.pours[0]??null}
 pouringAt(slot:number){return this.pours.find(job=>job.slot===slot)}
 pouringFrom(action:Pour['action'],head?:number,lane?:number){
  return this.pours.some(job=>job.action===action&&(action!=='transfer'||job.head===head&&job.lane===lane))
 }
 cups:(Drink|null)[];selected=0;source:'cup'|'food'='cup';foodIndex=0;towel:(Serving|null)[]
 citrus:Cycle|null=null;orangeStock=0
 brew:Cycle|null=null;blend:Cycle|null=null;teaReady=false;blendReady=false;teaStock=0;blendStock=0
 snap:(Cycle&{slot:number})|null=null
 stock:Record<string,number>={};reserve:Record<string,number>={};drawer=false
 returns:{cup:Cup;at:number}[]=[];dirty:Cup[]=[];washRack:Cup[]=[];wash:Cycle|null=null;washed=false
 guests:Guest[];deliveries:Delivery[]=[];served=0;expired=0;sales=0;tips=0;bonuses=0
 payments:{guest:number;price:number;tip:number;bonus:number;at:number}[]=[]
 get lastPayment(){return this.payments.at(-1)}
 get coins(){return this.sales+this.tips+this.bonuses}
 smiles=0;combo=0;lastPay:number|null=null;waste=0;wastePieces:string[]=[];get binLoad(){return this.wastePieces.length}compacting:Cycle|null=null;binChanged=-1000;nextUid=1;events:string[]=[]
 constructor(data:Config,tuning:Tuning){
  this.data=data;this.tuning=tuning;this.seed=data.seed;this.beans=data.capacity.startBeans;this.ground=data.capacity.startGround
  this.milkTank=data.capacity.milkTank;this.milkReserve=data.capacity.carton*data.capacity.milkCartons
  this.groups=Array.from({length:data.capacity.heads},()=>({dirty:false,flush:null,pulls:data.capacity.basketDoses,pots:Array(data.capacity.pitchers).fill(null),extraction:null}));this.ice=data.capacity.ice;this.bags=data.capacity.beanBags
  this.ovenSlots=Array.from({length:data.capacity.oven},()=>emptyHotSlot(0))
  this.pressSlots=Array.from({length:data.capacity.press},()=>emptyHotSlot(0))
  this.bagCounts=Array.from({length:4},(_,i)=>Math.floor((this.bags+3-i)/4))
  this.towel=Array(data.capacity.towel).fill(null)
  this.cups=Array(data.capacity.saucers).fill(null)
  this.guests=data.orders.map((o,i)=>{this.seed=nextRandom(this.seed);return {received:null,gotDrink:false,gotFood:false,state:'queued',fromLine:false,since:0,left:this.ticks(o.patience),arrival:this.ticks(o.after+(i?this.seed/4294967296*data.jitterSeconds:0))}})
  for(const cup of Object.keys(data.cups) as Cup[])for(const size of takeCup(cup)?sizes:['Medium'] as Size[]){
   const key=stockKey(cup,size);this.stock[key]=takeCup(cup)?data.capacity.takeaway:data.capacity.ceramic
   this.reserve[key]=takeCup(cup)?data.capacity.reserve:0
  }
  this.kitchen=data.startView==='Kitchen';this.end=data.startView==='Window'?'Window':'Door'
  this.advanceGuests()
 }
 private returnCup(slot:number,cup:Cup,size:Size){
  const c=this.cups[slot]
  if(!c||c.cup!==cup||c.size!==size||c.shot||c.add.length||c.lid||this.pouringAt(slot))return 'Only an untouched cup fits its original holder'
  const key=stockKey(cup,size)
  if(takeCup(cup)&&this.stock[key]>=this.data.capacity.takeaway)this.reserve[key]++
  else this.stock[key]++
  this.cups[slot]=null;return this.log('Empty cup returned to rack')
 }
 canAdd(slot:number,add:Add){
  const c=this.cups[slot]
  return !!c&&!c.lid&&!this.pouringAt(slot)&&!this.pouringFrom(add)&&!c.add.includes(add)&&c.add.length<this.data.capacity.finishPortions
 }
 /** Read-only eligibility for a directed drag, including the existing one-pour queue. */
 canDropPour(cmd:DirectedPour){
  const cup=this.cups[cmd.slot],active=this.pouringAt(cmd.slot)
  if(!cup||cup.lid||this.kitchen||this.turn||this.done)return false
  if(active&&this.pending.has(cmd.slot))return false
  if(cmd.action==='pour')return active?!cup.shot&&!!this.pitcherBank(cmd.head)?.[cmd.lane]:this.canTransfer(cmd.slot,cmd.head,cmd.lane)
  const add=cmd.add,cap=this.data.capacity,need=cup.size==='Large'?cap.largePortions:1
  if(active){if(cup.add.includes(add)||active.action===add||cup.add.length+(active.action!=='transfer'?1:0)>=cap.finishPortions)return false}
  else if(!this.canAdd(cmd.slot,add))return false
  const stock=({milk:this.milk,foam:this.textures.airy,coldmilk:this.milkReserve,ice:this.ice,cold:this.blendStock,tea:this.teaStock,orange:this.orangeStock} as Partial<Record<Add,number>>)[add]
  if(stock!==undefined&&stock<need)return false
  // Queues intentionally accept stocked ingredients even while a source is busy,
  // as before; immediate pours also require the machine to be idle.
  if(!active&&(add==='milk'&&this.steamJobs.silky||add==='foam'&&this.steamJobs.airy||add==='orange'&&this.citrus))return false
  return true
 }
 freePitcher(head:number){
  const group=this.groups[head]
  return group?.pots.findIndex((p,lane)=>p===null&&!this.pouringFrom('transfer',head,lane))??-1
 }
 canTransfer(slot:number,head=0,lane=0){
  const c=this.cups[slot]
  return !!this.pitcherBank(head)?.[lane]&&!this.pouringAt(slot)&&!!c&&!c.shot&&!c.lid
 }
 canServe(guest:number,kind:'cup'|'food',slot:number,pack=false){
  const g=this.guests[guest],o=this.data.orders[guest]
  if(!g||!o||g.state!=='waiting'||o.end!==this.end||this.kitchen||this.turn)return false
  if(kind==='food')return !!this.foodAt(slot)&&!g.gotFood&&this.foodAt(slot)!.food===o.food
  const c=this.cups[slot]
  return !!c&&!g.gotDrink&&!this.pending.has(slot)&&!this.pouringAt(slot)&&this.recipe(c)===o.drink&&takeCup(c.cup)===(o.mode==='To go')&&c.size===o.size&&(o.mode!=='To go'||c.lid||pack)
 }
 ticks(seconds:number){return Math.ceil(seconds*1000/this.data.tickMs)}
 cycle(id:Station):Cycle{return {start:this.tick,end:this.tick+this.ticks(this.data.stations[id])}}
 log(msg:string){this.events.push(this.tick+' · '+msg);return msg}
 get delivery(){return this.deliveries.at(-1)??null}
 get done(){return this.served+this.expired===this.guests.length}
 get stars(){return this.tuning.starFractions.filter(f=>this.smiles>=Math.ceil(f*this.guests.length)).length}
 matches(c:Drink,r:Recipe){return (r.cup===c.cup||r.travelCup===c.cup)&&r.shot===c.shot}
 recipe(c:Drink|null){if(!c||(!c.poured&&!c.add.length))return undefined
  return Object.entries(this.data.recipes).find(([,r])=>this.matches(c,r)&&r.add.slice().sort().join()===c.add.slice().sort().join())?.[0]
 }
 label(c:Drink|null){if(!c)return 'Empty';const k=this.recipe(c);return k?this.data.recipes[k].name:this.data.cups[c.cup]}
 get view(){return this.kitchen?'Kitchen':this.end}
 collect(food:Food,i=this.towel.indexOf(null)){if(!Number.isInteger(i)||this.towel[i]!==null)return false;this.towel[i]={food};this.foodIndex=i;this.source='food';return true}
 private binBlock(){
  if(this.compacting)return 'Compactor cycling · keep cooking'
  if(this.binLoad>=this.data.capacity.bin)return 'Bin full · tap the compactor'
  return null
 }
 private depositWaste(sprite:string){
  this.wastePieces.push(sprite);this.waste++;this.binChanged=this.tick
 }
 private loadHot(station:HotBay,index?:number,dragged=false){
  const slots=station==='oven'?this.ovenSlots:this.pressSlots
  const i=index??slots.findIndex(s=>s.state==='empty')
  if(!Number.isInteger(i)||slots[i]?.state!=='empty')return station==='oven'?'Oven rack occupied':'Press plate occupied'
  slots[i]={...emptyHotSlot(this.tick),state:'loaded'}
  if(!dragged)this.foodFlights.push({...this.cycle('foodFlight'),food:station==='oven'?'raw':'panino',slot:i})
  if(station==='oven')this.loading=this.cycle('load')
  this.started=true
  return this.log(station==='oven'?'Loaded cornetto':'Panino loaded')
 }
 private advanceHot(slots:HotSlot[],grace:number|undefined,station:HotBay){
  for(const slot of slots){
   if(slot.cook&&this.tick>=slot.cook.end){
    slot.state='ready';slot.since=this.tick;slot.cook=null
    slot.deadline=grace?this.tick+this.ticks(grace):null
   }else if(slot.deadline!==null&&this.tick>=slot.deadline){
    slot.state='burnt';slot.since=this.tick;slot.deadline=null
    this.log(station==='oven'?'Cornetto overbaked · clear the rack':'Panino overgrilled · clear the plate')
   }
  }
 }
 private operateHot(station:HotBay,index?:number,towelSlot?:number,dragged=false){
  const slots=station==='oven'?this.ovenSlots:this.pressSlots
  // Legacy whole-machine controls collect one item, or start the loaded oven batch.
  const next=index??(['ready','burnt','loaded','cooking'] as const)
   .map(state=>slots.findIndex(slot=>slot.state===state)).find(i=>i>=0)
  if(next===undefined||!Number.isInteger(next)||!slots[next])return station==='oven'?'Load a cornetto first':'Load a panino first'
  const slot=slots[next]
  if(towelSlot!==undefined&&slot.state!=='ready')return 'Choose a finished item to collect'
  switch(slot.state){
   case 'empty':return station==='oven'?'Load a cornetto first':'Load a panino first'
   case 'cooking':return station==='oven'?'Cornetti are baking':'Grilling'
   case 'loaded':{
    const batch=station==='oven'&&index===undefined?slots.filter(s=>s.state==='loaded'):[slot]
    for(const s of batch){s.state='cooking';s.since=this.tick;s.cook=this.cycle(station)}
    if(station==='oven')this.loading=null
    return this.log(station==='oven'?'Baking':'Grilling')
   }
   case 'ready':{
    const food=station==='oven'?'baked':slot.pesto?'pesto':'grilled'
    const reserveSlot=towelSlot===undefined?-1:towelSlot-this.towel.length
    if(reserveSlot>=0){
     const first=bayFirst(station)
     if(!Number.isInteger(reserveSlot)||reserveSlot<first||reserveSlot>=first+foodBay(station).capacity||this.foodReserve[reserveSlot]!==null)return 'Choose an empty matching well'
     this.foodReserve[reserveSlot]={food};this.foodIndex=towelSlot!;this.source='food'
    }else if(!this.collect(food,towelSlot))return towelSlot===undefined?'Both towel spaces are occupied':'Choose an empty towel space'
    if(!dragged)this.outputFlights.push({...this.cycle('foodFlight'),station,slot:next,towelSlot:this.foodIndex,food,item:this.foodAt(this.foodIndex)!})
    slots[next]=emptyHotSlot(this.tick)
    if(station==='oven')this.ovenDoor=this.cycle('load')
    return this.log(station==='oven'?'Warm cornetto collected':'Grilled panino collected')
   }
   case 'burnt':{
    const blocked=this.binBlock();if(blocked)return blocked
    slots[next]=emptyHotSlot(this.tick);this.depositWaste(station==='oven'?'baked':'grilled')
    if(station==='oven')this.ovenDoor=this.cycle('load')
    return this.log(station==='oven'?'Overbaked cornetto cleared':'Overgrilled panino cleared')
   }
  }
 }
 private advanceGuests(){
  this.guests.forEach((g,i)=>{
   const o=this.data.orders[i],age=this.tick-g.since
   const busy=()=>this.guests.some((v,j)=>j!==i&&this.data.orders[j].end===o.end&&this.data.orders[j].spot===o.spot&&['walking','ready','waiting','paid','leaving'].includes(v.state))
   if(g.state==='queued'&&this.age>=g.arrival){
    g.state=busy()?'joining':'walking';g.since=this.tick
   }else if(g.state==='joining'&&age>=this.ticks(this.data.stations.entrance)){g.state='line';g.since=this.tick}
   else if(g.state==='line'&&!busy()){g.state='walking';g.fromLine=true;g.since=this.tick}
   else if(g.state==='walking'&&age>=this.ticks(this.data.stations.entrance)){g.state='ready';g.since=this.tick}
   else if(g.state==='waiting'&&this.started&&--g.left===0){g.state='leaving';g.since=this.tick;this.expired++;this.combo=0;this.lastPay=null;this.log('Guest left · '+o.name)}
   else if((g.state==='paid'||g.state==='leaving')&&age>=this.ticks(this.data.stations.departure)){g.state='gone'}
   if(g.state==='ready'&&!this.kitchen&&this.end===o.end&&!this.turn){g.state='waiting';g.since=this.tick}
  })
 }
 step(){
  this.tick++;
  if(this.compacting&&this.tick>=this.compacting.end){this.compacting=null;this.wastePieces=[];this.binChanged=this.tick;this.log('Compactor ready')}
  while(this.returns.length&&this.returns[0].at<=this.tick)this.dirty.push(this.returns.shift()!.cup)
  if(this.wash&&this.tick>=this.wash.end){this.wash=null;this.washed=true}
  if(this.started&&!this.done)this.age++
  if(this.turn&&this.tick>=this.turn.end){const to=this.turn.to;this.kitchen=to==='Kitchen';if(to!=='Kitchen')this.end=to;this.turn=null}
  if(this.grind&&this.tick>=this.grind.end){this.grind=null;this.grinding=0;this.basket='dosed';this.basketMoved=this.tick;this.log(this.assistedService?'Fresh dose ready · tap grinder to tamp':'Fresh grounds ready · lift portafilter from grinder')}
  if(this.basketCycle&&this.tick>=this.basketCycle.end){
   const stage=this.basket;this.basketCycle=null;this.basketMoved=this.tick
   if(this.assistedService&&stage==='released'){
    this.basket='knocking';this.basketCycle=this.cycle('knock')
   }
   if(stage==='knocking'){
    this.basket='clean';this.log('Spent puck dropped into knock box')
    if(this.assistedService)this.basketCycle=this.cycle('handleTravel')
   }
   if(this.assistedService&&stage==='clean'){
    this.basket='emptyHeld';this.log('Handle docked · tap grinder to start')
   }
   if(this.assistedService&&stage==='dosedHeld'){
    this.basket='tamping';this.basketCycle=this.cycle('load')
   }
   if(stage==='tamping'){this.basket='tamped';this.log('Grounds tamped level · lock into espresso group')}
   if(stage==='locking'){this.basket='mounted';this.assistedService=false;this.pulls=this.data.capacity.basketDoses;this.log('Portafilter twisted right · group locked')}
  }
  for(const texture of ['silky','airy'] as const){
   const job=this.steamJobs[texture]
   if(job&&this.tick>=job.end){this.textures[texture]+=job.amount;this.steamJobs[texture]=null}
  }
  if(this.fridgeDoor&&this.tick>=this.fridgeDoor.end)this.fridgeDoor=null
  if(this.milkRefill&&this.tick>=this.milkRefill.end){this.milkTank+=this.milkRefill.amount;this.milkRefill=null}
  this.foodFlights=this.foodFlights.filter(job=>job.end>this.tick)
  if(this.hopperFill&&this.tick>=this.hopperFill.end)this.hopperFill=null
  if(this.ovenDoor&&this.tick>=this.ovenDoor.end)this.ovenDoor=null
  if(this.loading&&this.tick>=this.loading.end)this.loading=null
  this.outputFlights=this.foodOutputs.filter(job=>job.end>this.tick)
  this.advanceHot(this.ovenSlots,this.data.ovenGrace,'oven')
  this.advanceHot(this.pressSlots,this.data.pressGrace,'press')
  if(this.citrus&&this.tick>=this.citrus.end){this.citrus=null;this.orangeStock=this.data.capacity.citrus}
  if(this.brew&&this.tick>=this.brew.end){this.brew=null;this.teaReady=true}
  if(this.blend&&this.tick>=this.blend.end){this.blend=null;this.blendReady=true}
  if(this.snap&&this.tick>=this.snap.end)this.snap=null
  for(const group of this.groups){
   if(group.flush&&this.tick>=group.flush.end){group.dirty=false;group.flush=null;this.log('Group rinsed')}
   const job=group.extraction
   if(job&&this.tick>=job.end){group.pots[job.lane]=job.shot;group.extraction=null}
  }
  if(this.microwave&&this.tick>=this.microwave.end){this.microwave=null;this.microReady=true}
  for(const job of this.pours.filter(p=>p.end<=this.tick)){
   const cup=this.cups[job.slot]!
   if(job.action==='transfer')cup.poured=true
   else cup.add.push(job.action)
   this.pours.splice(this.pours.indexOf(job),1)
   const next=this.pending.get(job.slot)
   this.pending.delete(job.slot)
   if(next&&next.uid===cup.uid)this.command(next.command)
  }
  while(this.deliveries[0]&&this.tick>=this.deliveries[0].end)this.deliveries.shift()
  this.advanceGuests()
 }
 command(c:Input):string{
  if(this.done)return 'Service complete'
  if(this.turn)return 'Turning to the other counter'
  const cap=this.data.capacity
  if(c.action==='to'){
   if(c.view===this.view)return 'Already here'
   this.pending.clear();this.drawer=false;this.turn={...this.cycle('turn'),to:c.view};return this.log('Turn to '+c.view)
  }
  const rear=['washLoad','washRun']
  const common=['oven','load','sandwich','press','pesto','brownie','tea','blend','returnBrownie','food','compact','discard','trash','drawer','restock']
  if(!common.includes(c.action)&&rear.includes(c.action)!==this.kitchen)return this.kitchen?'Return to the counter':'Use the Kitchen'
  switch(c.action){
   case 'bankHot':return this.stageHot(c.station,c.slot,c.dragged)
   case 'parkShot':{
    const bank=this.groups[c.head]?.pots,shot=bank?.[c.lane]
    if(!bank||!shot)return 'Pull a shot first'
    if(this.shotReserve[c.pocket]!==null||this.pouringFrom('transfer',reserveHead,c.pocket))return 'Choose an empty shot pocket'
    bank[c.lane]=null;this.shotReserve[c.pocket]=shot
    this.stagedShotMotion.set(c.pocket,{...this.cycle('foodFlight'),head:c.head,lane:c.lane})
    return this.log(shot==='short'?'Short shot staged':'Standard shot staged')
   }
   case 'dropPour':{
    const cmd=c.pour,cup=this.cups[cmd.slot]
    const active=this.pouringAt(cmd.slot)
    if(!active)return this.command(cmd)
    if(!cup||cup.lid)return 'Drop onto an open cup'
    if(this.pending.has(cmd.slot))return 'Two pours are already in progress'
    if(cmd.action==='add'&&(cup.add.includes(cmd.add)||active.action===cmd.add))return 'That ingredient is already in this cup'
    if(cmd.action==='pour'&&(cup.shot||!this.pitcherBank(cmd.head)?.[cmd.lane]))return 'Choose a ready pitcher and a cup without espresso'
    if(cmd.action==='add'){
     const need=cup.size==='Large'?cap.largePortions:1
     const stock=({milk:this.milk,foam:this.textures.airy,coldmilk:this.milkReserve,ice:this.ice,cold:this.blendStock,tea:this.teaStock,orange:this.orangeStock} as Partial<Record<Add,number>>)[cmd.add]
     if(stock!==undefined&&stock<need)return 'Prepare more '+this.data.finishes[cmd.add].toLowerCase()+' first'
     if(cup.add.length+(active.action!=='transfer'?1:0)>=cap.finishPortions)return 'This cup has no room for another ingredient'
    }
    this.pending.set(cmd.slot,{uid:cup.uid,command:cmd});return this.log('Next pour queued for cup '+(cmd.slot+1))
   }

   case 'drawer':this.drawer=!this.drawer;return this.log(this.drawer?'Reserve open · choose a stack':'Reserve closed')
   case 'restock':{
    if(!this.drawer||!takeCup(c.cup))return 'Open the reserve drawer'
    const key=stockKey(c.cup,c.size),qty=Math.min(cap.takeaway-this.stock[key],this.reserve[key])
    if(!qty)return this.stock[key]===cap.takeaway?'Stack already full':'No reserve bundles left'
    this.stock[key]+=qty;this.reserve[key]-=qty;this.drawer=false;return this.log('Stack replenished')
   }
   case 'washLoad':
    if(this.wash||this.washed)return 'Unload the clean rack before loading'
    if(!this.dirty.length)return 'Dish return is empty'
    if(this.washRack.length>=cap.wash)return 'Rack full · start dishwasher'
    this.washRack.push(this.dirty.shift()!);return this.log('Cup loaded into dishwasher')
   case 'washRun':
    if(this.wash)return 'Dishwasher running'
    if(this.washed){for(const cup of this.washRack)this.stock[cup]++;this.washRack=[];this.washed=false;return this.log('Clean cups back on the rack')}
    if(!this.washRack.length)return 'Load cups from the dish return first'
    this.wash=this.cycle('wash');return this.log('Wash cycle started')
   case 'compact':
    if(this.compacting)return 'Compactor cycling · keep cooking'
    if(!this.binLoad)return 'Drop unwanted drinks, shots or food here'
    this.compacting=this.cycle('compact');return this.log('Compacting waste')
   case 'trash':{
    const blocked=this.binBlock();if(blocked)return blocked
    const t=c.target;let scrap='liquid'
    if(t.kind==='food'){const food=this.takeFood(t.slot);if(!food)return 'Empty space';scrap=food.food==='pesto'?'grilled-pesto':food.food}
    else if(this.kitchen)return 'Return to the counter'
    else if(t.kind==='shot'){const bank=this.pitcherBank(t.head??0),lane=t.lane??0;if(!bank?.[lane])return 'Shot pitcher empty';bank[lane]=null}
    else{const item=this.cups[t.slot];if(!item||this.pouringAt(t.slot))return 'Finish the pour first'
     if(!takeCup(item.cup))this.dirty.push(item.cup);else scrap=item.cup+'-empty';this.cups[t.slot]=null}
    this.depositWaste(scrap);return this.log('Discarded')
   }
   case 'returnCup':return this.returnCup(c.slot,c.cup,c.size)
   case 'returnBrownie':{
    const f=this.towel[c.slot];if(!f||f.food!=='brownie')return 'Only a brownie goes back into this bin'
    this.towel[c.slot]=null;return this.log('Brownie returned')
   }
   case 'beans':{
    if(this.hopperFill||this.grind||this.beans)return 'Use the beans already in the hopper'
    if(!this.bags)return 'Bean cupboard empty'
    const bag=c.bag??this.bagCounts.findIndex(n=>n>0)
    if(!this.bagCounts[bag])return 'That stack is empty'
    this.bagCounts[bag]--;this.bags--;this.beans=cap.hopper;this.hopperFill=this.cycle('load');this.started=true;return this.log('House roast poured into hopper')
   }
   case 'serviceGroup':{
    const group=this.groups[c.head]
    if(!group)return 'Unknown group'
    if(this.basket==='tamped'&&c.head===this.serviceHead)return this.command({action:'lock'})
    if(this.basket!=='mounted')return 'Finish servicing group '+(this.serviceHead+1)+' first'
    if(group.pulls||group.extraction)return 'Finish the current basket first'
    this.serviceHead=c.head;this.assistedService=true;this.basket='released'
    this.basketMoved=this.tick;this.basketCycle=this.cycle('handleTravel')
    group.dirty=true;group.flush=this.cycle('purge')
    return this.log('Group '+(c.head+1)+' rinsing · knocking out spent puck')
   }
   case 'grinderLever':
    if(this.assistedService&&this.basket==='dosed'){
     this.basket='dosedHeld';this.basketMoved=this.tick;this.basketCycle=this.cycle('handleTravel')
     return this.log('Fresh grounds moving to the tamp mat')
    }
    return this.command({action:'grind'})
   case 'releaseKnock':
    return this.command({action:'release'})
   case 'release':
    {const h=c.head??0,group=this.groups[h];if(!group||this.basket!=='mounted'||group.extraction||group.pulls)return 'Finish the current basket first';this.serviceHead=h;group.dirty=true}
    this.basket='released';this.basketMoved=this.tick;return this.log('Handle released · knock out puck')
   case 'purge':{
    const h=c.head??this.serviceHead,group=this.groups[h]
    if(!group||this.serviceHead!==h||this.basket==='mounted'||!group.dirty||group.flush)return 'Purge the exposed group after removing its spent handle'
    group.flush=this.cycle('purge');return this.log('Purging group '+(h+1))
   }
   case 'pick':
    if(this.assistedService)return 'Handle follows the service track'
    if(this.basket==='released'){this.basket='held';this.basketMoved=this.tick;return this.log('Spent portafilter picked up · tap the knock box')}
    if(this.basket==='clean'){this.basket='emptyHeld';this.basketMoved=this.tick;return this.log('Empty portafilter picked up · insert into grinder')}
    return 'Pick up the handle from the counter first'
   case 'knock':
    if(this.basket!=='held')return 'Pick up the spent portafilter before using the knock box'
    this.basket='knocking';this.basketCycle={start:this.tick,end:this.tick+this.ticks(this.data.stations.knock)};this.basketMoved=this.tick;return this.log('Knocking spent puck into the box')
   case 'dose':
    if(this.assistedService)return this.command({action:'grinderLever'})
    if(this.basket!=='dosed')return this.basket==='grinding'?'Grinding · wait for the ready indicator':'Grind into the empty portafilter first'
    this.basket='dosedHeld';this.basketMoved=this.tick;return this.log('Filled portafilter lifted · bring it to the tamping mat')
   case 'placeTamp':
    if(this.assistedService)return 'Tamping automatically'
    if(this.basket!=='dosedHeld')return 'Lift the filled portafilter from the grinder first'
    this.basket='atTamp';this.basketMoved=this.tick;return this.log('Full basket resting on black tamp mat · tap the tamper')
   case 'moveToTamp':
    if(this.assistedService)return this.command({action:'grinderLever'})
    if(this.basket!=='dosed')return 'Wait until the fresh dose is ready'
    this.basket='atTamp';this.basketMoved=this.tick;return this.log('Full basket moved to tamp mat · press with the metal tamper')
   case 'tamp':
    if(this.basket!=='atTamp')return 'Place the filled basket on the tamping mat first'
    this.basket='tamping';this.basketCycle=this.cycle('load');this.basketMoved=this.tick;return this.log('Tamping ground coffee')
   case 'lock':
    if(this.basket!=='tamped')return 'Tamp the fresh grounds before locking the group'
    if(this.groups[this.serviceHead].dirty)return 'Purge the exposed group before locking the handle'
    this.basket='locking';this.basketCycle=this.cycle(this.assistedService?'handleLock':'load');this.basketMoved=this.tick;return this.log('Insert handle from left · rotate right to lock')
   case 'grind':{
    if(this.basket!=='emptyHeld')return this.basket==='grinding'?'Grinding fresh coffee':'Pick up the empty portafilter and insert it in the grinder first'
    if(this.hopperFill)return 'Filling hopper'
    if(this.grind)return 'Grinding in progress'
    if(!this.beans)return 'Choose a bag from the bean cupboard'
    if(this.beans<cap.basketDoses)return 'Not enough beans for this portafilter'
    this.grinding=cap.basketDoses;this.beans-=this.grinding;this.grind=this.cycle('grinder');this.basket='grinding';this.basketMoved=this.tick;break
   }
   case 'refillMilk':{
    this.fridgeDoor=this.cycle('fridgeDoor')
    if(this.milkRefill)return 'Milk is refilling'
    const amount=Math.min(cap.milkTank-this.milkTank,cap.carton,this.milkReserve)
    if(!amount)return this.milkTank===cap.milkTank?'Tank is full':'Fridge is empty'
    this.milkReserve-=amount;this.milkRefill={...this.cycle('refillMilk'),amount};this.started=true;return this.log('Refilling milk tank')
   }
   case 'steam':{
    const texture=c.texture??'silky'
    if(this.steamJobs[texture])return 'This steam wand is working'
    if(this.pouringFrom(texture==='silky'?'milk':'foam'))return 'Pitcher is pouring'
    if(this.textures[texture]>=cap.milkBatch)return 'This pitcher is full'
    if(!this.milkTank)return 'Use the milk fridge to refill the tank'
    const amount=Math.min(cap.milkBatch-this.textures[texture],this.milkTank)
    this.milkTank-=amount;this.steamJobs[texture]={...this.cycle('steamer'),amount};break
   }
   case 'load':return this.loadHot('oven',c.slot,c.dragged)
   case 'sandwich':return this.loadHot('press',c.slot,c.dragged)
   case 'oven':
   case 'press':return this.operateHot(c.action,c.slot,c.towelSlot,c.dragged)
   case 'brownie':if(!this.collect('brownie'))return 'Both towel spaces are occupied';break
   case 'pesto':{
    const i=c.slot??this.pressSlots.findIndex(slot=>slot.state==='loaded'&&!slot.pesto)
    const slot=this.pressSlots[i]
    if(!Number.isInteger(i)||slot?.state!=='loaded')return 'Load a panino before adding pesto'
    if(slot.pesto)return 'Pesto already added to this panino'
    slot.pesto=true;slot.pestoAt=this.tick;return this.log('Basil pesto spread on panino '+(i+1))
   }
   case 'citrus':
    if(this.citrus)return 'The citrus press is running'
    if(this.orangeStock===cap.citrus)return 'The juice carafe is full'
    if(this.pouringFrom('orange'))return 'Return the juice carafe to the press first'
    this.citrus=this.cycle('citrus');break
   case 'tea':
    if(this.brew)return 'Tea is steeping'
    if(this.teaReady&&this.teaStock===cap.tea)return 'Use the tea in your carafe first'
    if(this.teaReady){this.teaStock=cap.tea;this.teaReady=false;return this.log('Tea carafe collected')}
    this.brew=this.cycle('tea');break
   case 'blend':
    if(this.blend)return 'Blender is running'
    if(this.blendReady&&this.blendStock===cap.blend)return 'Use the chilled base in your carafe first'
    if(this.blendReady){this.blendStock=cap.blend;this.blendReady=false;return this.log('Frappé base collected')}
    this.blend=this.cycle('blend');break
   case 'refillIce':
    if(this.ice===cap.ice)return 'Ice well is full'
    this.ice=cap.ice;return this.log('Ice well replenished')
   case 'heat':
    if(this.microwave)return 'Cornetto warming'
    if(this.microReady){if(!this.collect('baked'))return 'Clear a food space';this.microReady=false;return this.log('Warm cornetto collected')}
    this.microwave=this.cycle('microwave');this.started=true;return this.log('Warming one cornetto')
   case 'pull':{
    const h=c.head??0,lane=c.lane??0,group=this.groups[h]
    if(!group||!Number.isInteger(lane)||lane<0||lane>=group.pots.length)return 'Unknown pitcher'
    if(group.pots[lane]||group.extraction||this.pouringFrom('transfer',h,lane))return 'This group or pitcher is busy'
    if((this.serviceHead===h&&this.basket!=='mounted')||!group.pulls)return 'Reset this spent basket'
    group.pulls--;group.extraction={...this.cycle(c.shot),shot:c.shot,lane};break
   }
   case 'cup':{
    const size=c.size??'Medium',current=this.cups[this.selected]
    if(c.slot===undefined&&this.source==='cup'&&current?.cup===c.cup&&current.size===size&&!current.shot&&!current.add.length&&!this.pouringAt(this.selected)){
     return this.returnCup(this.selected,c.cup,size)
    }
    const slot=c.slot??(this.cups[this.selected]===null?this.selected:this.cups.indexOf(null));if(!Number.isInteger(slot)||slot<0||slot>=this.cups.length||this.cups[slot])return 'Both saucers are occupied'
    const key=stockKey(c.cup,size)
    if(!this.stock[key])return takeCup(c.cup)?'Stack empty · open reserve drawer':'Rack empty · wash returned cups'
    this.stock[key]--
    this.cups[slot]={uid:this.nextUid++,cup:c.cup,size,shot:null,add:[],poured:false,lid:false,placed:this.tick}
    this.selected=slot;this.source='cup';this.started=true;break
   }
   case 'pour':{
    const h=c.head??0,lane=c.lane??0,slot=c.slot??this.selected,cup=this.cups[slot]
    const bank=this.pitcherBank(h);if(!bank?.[lane])return 'This pitcher has no ready shot'
    if(!this.canTransfer(slot,h,lane))return 'Choose an open cup without espresso'
    this.selected=slot;this.source='cup';cup!.shot=bank[lane];bank[lane]=null
    this.pours.push({...this.cycle('transfer'),action:'transfer',slot,head:h,lane});break
   }
   case 'lid':{
    const cup=this.cups[this.selected]
    if(this.source!=='cup'||!cup||!takeCup(cup.cup)||!this.recipe(cup)||cup.lid||this.pouringAt(this.selected))return 'Select a finished takeaway cup'
    cup.lid=true;this.snap={...this.cycle('lid'),slot:this.selected};break
   }
   case 'food':if(!this.foodAt(c.slot))return 'Empty towel space';this.source='food';this.foodIndex=c.slot;return this.log('Food selected')
   case 'select':
    if(!Number.isInteger(c.slot)||c.slot<0||c.slot>=this.cups.length)return 'Unknown saucer'
    this.selected=c.slot;this.source='cup';return this.log(this.cups[c.slot]?this.label(this.cups[c.slot])+' selected':'Empty saucer selected')
   case 'serve':
    if(!this.canServe(c.guest,c.kind,c.slot,true))return 'The dragged item does not match that ticket'
    if(c.kind==='cup'&&takeCup(this.cups[c.slot]!.cup))this.cups[c.slot]!.lid=true
    this.source=c.kind; if(c.kind==='cup')this.selected=c.slot;else this.foodIndex=c.slot
    return this.command({action:'guest',guest:c.guest})
   case 'add':{
    const slot=c.slot??this.selected,cup=this.cups[slot]
    if(!cup||(c.slot===undefined&&this.source!=='cup'))return 'Select an open cup'
    if(!this.canAdd(slot,c.add))return 'Choose an open cup with room for this ingredient'
    const portions=cup.size==='Large'?cap.largePortions:1
    if(c.add==='ice'){if(this.ice<portions)return 'Refill the ice well';this.ice-=portions}
    if(c.add==='milk'||c.add==='foam'){
     const texture=c.add==='milk'?'silky':'airy'
     if(this.steamJobs[texture])return 'Wait for this pitcher to finish steaming'
     if(this.textures[texture]<portions)return 'Steam more '+texture+' milk first'
     this.textures[texture]-=portions
    }
    if(c.add==='coldmilk'){if(this.milkReserve<portions)return 'No cold milk left in the fridge';this.milkReserve-=portions;this.fridgeDoor=this.cycle('fridgeDoor')}
    if(c.add==='orange'){if(this.citrus||this.orangeStock<portions)return 'Press a fresh batch of orange juice';this.orangeStock-=portions}
    if(c.add==='tea'){if(this.teaStock<portions)return 'Collect a fresh tea carafe';this.teaStock-=portions}
    if(c.add==='cold'){if(this.blendStock<portions)return 'Collect a fresh blender batch';this.blendStock-=portions}
    this.source='cup';this.selected=slot;this.pours.push({...this.cycle('finish'),action:c.add,slot});break
   }
   case 'discard':{
    const kind=this.source==='food'&&this.foodAt(this.foodIndex)?'food':this.cups[this.selected]?'drink':'shot'
    return this.command({action:'trash',target:{kind,slot:kind==='food'?this.foodIndex:this.selected}})
   }
   case 'guest':{
    const g=this.guests[c.guest],o=this.data.orders[c.guest]
    if(!g||g.state!=='waiting'||o.end!==this.end)return 'No open ticket here'
    const takeaway=o.mode==='To go'
    if(this.source==='food'){
     const f=this.foodAt(this.foodIndex)
     if(!f||g.gotFood||f.food!==o.food)return 'This ticket needs a different item'
     g.gotFood=true;this.deliveries.push({...this.cycle('service'),guest:c.guest,slot:this.foodIndex,drink:null,food:f});this.takeFood(this.foodIndex)
    }else{
     const cup=this.cups[this.selected]
     if(!cup||this.pending.has(this.selected)||this.pouringAt(this.selected)||g.gotDrink||this.recipe(cup)!==o.drink)return 'Check the drink on this ticket'
     if(takeCup(cup.cup)!==takeaway||cup.size!==o.size)return 'Check the service style and size'
     if(takeaway&&!cup.lid)return 'Snap on a lid first'
     if(!takeCup(cup.cup))this.returns.push({cup:cup.cup,at:this.tick+this.ticks(this.data.stations.dishReturn)})
     g.gotDrink=true;this.deliveries.push({...this.cycle('service'),guest:c.guest,slot:this.selected,drink:cup,food:null});this.cups[this.selected]=null
    }
    g.received=this.delivery
    if((o.food&&!g.gotFood)||(o.drink&&!g.gotDrink)){
     g.left=Math.min(this.ticks(o.patience),g.left+this.ticks(this.data.partialRelief??0))
     return this.log('Delivered · ticket still open')
    }
    g.state='paid';g.since=this.tick;this.served++
    const fraction=g.left/this.ticks(o.patience),z=fraction>=this.tuning.zoneBoundaries[1]?2:fraction>=this.tuning.zoneBoundaries[0]?1:0
    this.combo=this.lastPay!==null&&this.tick-this.lastPay<=this.ticks(this.tuning.comboSeconds)?this.combo+1:1;this.lastPay=this.tick
    const price=(o.drink?this.data.recipes[o.drink].price:0)+(o.food?this.data.foods[o.food].price:0)
    const tip=Math.round(price*this.tuning.tipFractions[z]*(o.tipMultiplier??1))
    const bonus=this.tuning.comboBonuses[Math.min(this.combo,this.tuning.comboBonuses.length)-1]
    this.sales+=price;this.tips+=tip;this.bonuses+=bonus
    this.payments.push({guest:c.guest,price,tip,bonus,at:this.tick})
    this.smiles+=this.tuning.smilesByZone[z];return this.log('Served '+o.name)
   }
  }
  this.started=true
  const messages={citrus:'Pressing fresh oranges',pull:'Extracting into pitcher',steam:'Steaming milk',grind:'Grinding',load:'Loaded cornetto',oven:'Baking',cup:'Empty cup staged',pour:'Pouring into selected cup',add:'Finishing drink',lid:'Lid snapped on',brownie:'Brownie collected',sandwich:'Panino loaded',pesto:'Pesto added',press:'Grilling',tea:'Steeping tea',blend:'Blending chilled base'}
  return this.log(messages[c.action])
 }
}
