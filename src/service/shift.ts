import type {Tuning} from '../content/model.ts'
import {nextRandom} from '../sim/random.ts'

export const resources=['dose','milk','warm','water','cold','bread','cookie'] as const
export type Resource=typeof resources[number]
export type Item='ristretto'|'espresso'|'americano'|'latte'|'cappuccino'|'frappe'|'pastry'|'warm'|'cookie'
export type Action='short'|'standard'|'water'|'milk'|'foam'|'cold'|'bread'|'warm'|'cookie'
type Room='Lounge'|'Back Bar'
type Supply={label:string;start:number;capacity:number;batch:number;cycle:number;grace:number;station:string}
type Recipe={label:string;price:number;steps:Action[]}
type Preparation={label:string;base:Item|null;result:Item;supply:Resource|null;seconds:number}
export interface ShiftData {
  id:string;seed:number;liftSeconds:number;openingDelay:number;wells:number;
  firstVisitDelay:number[];returnDelay:number[];supplies:Record<Resource,Supply>;recipes:Record<Item,Recipe>;
  actions:Record<Action,Preparation>;seats:{art:string;name:string}[];orders:{items:Item[];patience:number}[]
}
export type Seat={order:number;state:'awaiting'|'waiting'|'served'|'expired';left:number;max:number;next:number;resolved:number;delivered:Item[]}
type Station={phase:'idle'|'working'|'ready';left:number;count:number}
export type Input={action:'guest';seat:number}|{action:'station';resource:Resource}|{action:'prepare';tool:Action}|{action:'well';index:number}|{action:'cradle'}|{action:'travel'}|{action:'discard'}
export function validateShift(d:ShiftData,t:Tuning){
  const pos=(v:number)=>Number.isFinite(v)&&v>0
  if(!d.seats.length||d.orders.length<d.seats.length||!Number.isInteger(d.wells)||d.wells<1)throw Error('Invalid seats or holding wells')
  if(![d.openingDelay,d.liftSeconds].every(pos))throw Error('Invalid duration')
  if([d.firstVisitDelay,d.returnDelay].some(r=>r.length!==2||!r.every(pos)||r[0]>r[1]))throw Error('Invalid arrival range')
  for(const key of resources){
    const r=d.supplies[key]
    if(!r||![r.start,r.capacity,r.batch].every(Number.isInteger)||r.start<0||r.capacity<1||r.start>r.capacity||r.batch<1||!Number.isFinite(r.cycle)||r.cycle<0||(r.cycle>0&&!pos(r.grace)))throw Error('Invalid supply '+key)
  }
  for(const [name,r] of Object.entries(d.recipes)){
    let item:Item|null=null
    for(const step of r.steps){
      const a:Preparation=d.actions[step]
      if(!a||a.base!==item||!pos(a.seconds)||(a.supply&&!d.supplies[a.supply]))throw Error('Invalid recipe step '+step)
      item=a.result
    }
    if(item!==name||!pos(r.price))throw Error('Invalid recipe '+name)
  }
  if(d.orders.some(o=>!pos(o.patience)||!o.items.length||o.items.length>t.orderLimit||o.items.some(i=>!d.recipes[i])))throw Error('Invalid order')
}
export class Shift {
  data:ShiftData;tuning:Tuning; tick=0; rng:number; room:Room='Lounge'; transit=0; started=false; ended=false
  seats:Seat[]=[]; cursor=0; active:Item|null=null;parked:(Item|null)[];
  source:'active'|number='active'; operation:Action|null=null;work=0;workTotal=0
  get held(){return this.source==='active'?this.active:this.parked[this.source]}
  private clearSelected(){
    if(this.source==='active')this.active=null
    else this.parked[this.source]=null
    this.source='active'
  }
  stock:Record<Resource,number>;stations:Record<Resource,Station>
  coins=0;smiles=0;served=0;expired=0;combo=0;lastServe:number|null=null
  trash=0;rides=0;patienceSum=0;occupancySum=0;floorTicks={'Lounge':0,'Back Bar':0}; events:{tick:number;name:string}[]=[]
  constructor(data:ShiftData,tuning:Tuning,seed=data.seed) {
    validateShift(data,tuning);this.data=data;this.tuning=tuning;this.rng=seed
    this.parked=Array(data.wells).fill(null)
    this.stock=Object.fromEntries(resources.map(k=>[k,data.supplies[k].start])) as Record<Resource,number>
    this.stations=Object.fromEntries(resources.map(k=>[k,{phase:'idle',left:0,count:0}])) as Record<Resource,Station>
    let arrival=this.ticks(data.openingDelay)
    for(let i=0;i<data.seats.length;i++){
      if(i)arrival+=this.delay(data.firstVisitDelay)
      this.seats.push(this.seat(this.cursor++,arrival))
    }
  }
  ticks(seconds:number){return Math.ceil(seconds*1000/this.tuning.tickMs)}
  private delay(range:number[]){this.rng=nextRandom(this.rng);return this.ticks(range[0]+(range[1]-range[0])*this.rng/4294967296)}
  private seat(id:number,delay:number):Seat{
    const max=this.ticks(this.data.orders[id].patience)
    return {order:id,state:delay?'awaiting':'waiting',left:max,max,next:this.tick+delay,resolved:-1,delivered:[]}
  }
  log(name:string){this.events.push({tick:this.tick,name})}
  remaining(s:Seat){
    const items=[...this.data.orders[s.order].items]
    for(const item of s.delivered)items.splice(items.indexOf(item),1)
    return items
  }
  get stars(){return this.tuning.starFractions.filter(v=>this.smiles>=Math.ceil(this.data.orders.length*v)).length}
  private finish(i:number,success:boolean){
    const s=this.seats[i];s.resolved=this.tick;s.state=success?'served':'expired'
    if(success){
      const r=s.left/s.max,zone=r>=this.tuning.zoneBoundaries[1]?2:r>=this.tuning.zoneBoundaries[0]?1:0
      const base=this.data.orders[s.order].items.reduce((n,id)=>n+this.data.recipes[id].price,0)
      this.combo=this.lastServe!==null&&this.tick-this.lastServe<=this.ticks(this.tuning.comboSeconds)?this.combo+1:1
      this.lastServe=this.tick;this.served++;this.smiles+=this.tuning.smilesByZone[zone];this.patienceSum+=r
      this.coins+=Math.round(base*(1+this.tuning.tipFractions[zone])+this.tuning.comboBonuses[Math.min(this.combo,this.tuning.comboBonuses.length)-1])
    }else {this.expired++;this.combo=0;this.lastServe=null}
    this.log((success?'Served ':'Expired ')+this.data.seats[i].name)
    s.next=this.tick+this.delay(this.data.returnDelay)
    this.ended=this.served+this.expired===this.data.orders.length
  }
  command(c:Input):string {
    if(this.ended)return 'Shift complete'
    if(this.transit)return 'Lift in motion'
    if(c.action==='travel'){
      this.started=true;this.transit=this.ticks(this.data.liftSeconds);this.rides++;this.log('Lift departed');return 'Riding the lift…'
    }
    if(c.action==='station'){
      if(this.room!=='Back Bar')return 'Use the Back Bar'
      const k=c.resource,def=this.data.supplies[k],st=this.stations[k]
      if(!def.cycle){
        const amount=Math.min(def.batch,def.capacity-this.stock[k])
        if(!amount)return 'Already full'
        this.stock[k]+=amount;this.log('Loaded '+k+' ×'+amount);return 'Loaded '+def.label
      }
      if(st.phase==='ready'){
        const n=Math.min(st.count,def.capacity-this.stock[k]);if(!n)return 'Cart compartment is full'
        this.stock[k]+=n;st.count-=n;if(!st.count){st.phase='idle';st.left=0}
        this.log('Loaded '+k+' ×'+n);return 'Loaded '+n+' · '+def.label
      }
      if(st.phase==='working')return 'Batch in progress'
      st.phase='working';st.left=this.ticks(def.cycle);this.log('Started '+k);return 'Batch started'
    }
    if(this.room!=='Lounge')return 'Return to the Lounge'
    if(c.action==='well'){
      if(!this.parked[c.index])return 'Empty well · tap a finished cup to park it'
      this.source=c.index;return this.data.recipes[this.held!].label+' selected'
    }
    if(c.action==='cradle'){
      if(this.source!=='active'){this.source='active';return 'Pouring cradle selected'}
      if(!this.active)return 'Choose a pull or plate a snack'
      const i=this.parked.indexOf(null)
      if(i<0)return 'Both wells are full'
      this.parked[i]=this.active;this.active=null;this.log('Parked '+this.parked[i])
      return 'Parked · tap its well when ready to serve'
    }
    if(c.action==='discard'){
      if(!this.held)return 'Choose an item to discard'
      this.clearSelected();this.trash++;this.log('Discarded one item');return 'Item discarded'
    }
    if(c.action==='guest'){
      const s=this.seats[c.seat],item=this.held
      if(!s||s.state!=='waiting')return 'No open order here'
      if(!item)return 'Build a drink or plate a snack first'
      if(!this.remaining(s).includes(item))return 'This guest ordered something else'
      s.delivered.push(item);this.clearSelected();this.log('Delivered '+item+' to '+this.data.seats[c.seat].name)
      if(!this.remaining(s).length){this.finish(c.seat,true);return 'Served'}
      return 'Delivered · more on this order'
    }
    const a=this.data.actions[c.tool]
    if(this.work)return 'Preparation in progress'
    if(this.active!==a.base)return a.base?'Start with '+this.data.recipes[a.base].label:'Serve or park the item in the cradle first'
    if(a.supply&&!this.stock[a.supply])return this.data.supplies[a.supply].label+' empty · refill at Back Bar'
    if(a.supply)this.stock[a.supply]--
    this.started=true;this.active=null;this.source='active';this.operation=c.tool
    this.work=this.workTotal=this.ticks(a.seconds);this.log('Started '+a.label)
    return a.label+'…'
  }
  step(){
    if(!this.started||this.ended)return
    this.tick++
    if(this.transit){if(!--this.transit){this.room=this.room==='Lounge'?'Back Bar':'Lounge';this.log('Arrived '+this.room)}}else this.floorTicks[this.room]++
    const capacity=resources.reduce((n,k)=>n+this.data.supplies[k].capacity,0)
    this.occupancySum+=resources.reduce((n,k)=>n+this.stock[k],0)/capacity
    if(this.work&&!--this.work){
      this.active=this.data.actions[this.operation!].result;this.log('Ready '+this.active);this.operation=null
    }
    for(const k of resources){
      const st=this.stations[k],def=this.data.supplies[k]
      if(st.phase==='idle'||--st.left>0)continue
      if(st.phase==='working'){st.phase='ready';st.count=def.batch;st.left=this.ticks(def.grace);this.log('Ready '+k)}
      else {st.phase='idle';st.count=0;this.log('Batch lost '+k)}
    }
    this.seats.forEach((s,i)=>{
      if(s.state==='awaiting'){if(this.room==='Lounge'&&!this.transit&&this.tick>=s.next){s.state='waiting';this.log('Order opened '+this.data.seats[i].name)}}
      else if(s.state==='waiting'){if(!--s.left)this.finish(i,false)}
      else if(this.cursor<this.data.orders.length&&this.tick>=s.next){
        this.seats[i]=this.seat(this.cursor++,this.delay(this.data.firstVisitDelay))
      }
    })
  }
}
