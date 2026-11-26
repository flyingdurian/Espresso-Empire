import {activeCupId,activeCupPath} from './active-cup.ts'
import {servicePass,reserveHead,chooseShotPocket,juiceTouch} from './service-pass.ts'
import {lidSeats,lidTouch,holderTouch} from './cup-rack.ts'
import {machineControl} from './machine-control.ts'
import './style.css'
import {dropTarget} from './drop-target.ts'
import {canDrop} from './drop-eligibility.ts'
import {milkTouch,syrupTouch,saucerTouch,towelTouch,shotRackBezelTouch,shotPocketTouch,foodWellTouch,shotKeyTouch,portafilterTouch,applianceTouch,frontSupplyTouch,citrusTouch} from './touch-layout.ts'
import {counterTravel} from './counter-travel.ts'
import {cancelOwnedPointer} from './gesture-ownership.ts'
import {frontGalley,carafeTouch} from './galley-layout.ts'
import {filterPose} from './filter-pose.ts'
import {activeOrderIds,orderNumber} from './order-guide.ts'
import {recipeGuide} from './recipe-guide.ts'
import {bindImmersive} from './immersive.ts'
import {visibleStage,viewportMoved,type ViewRect} from './viewport-fit.ts'
import {Bench,stockKey,takeCup,toppingKeys,type Config,type End,type Input,type Add,type Size,type Drink} from './bench.ts'
import {breakfastName,piazzaShift,piazzaName,lunchName,lunchShift,shiftName,levelConfig,levels,upgrades,loadProgress,saveProgress,buyUpgrade,completeLevel} from './campaign.ts'
import {workstation} from './scene.ts'
import {layerTuner} from './layer-tuner.ts'
import {previewBench} from './layer-overrides.ts'
import {icePortions,iceTouch} from './ice-service.ts'
import {heads,holders,serveX,brewPoint,ounces,stage,beanBags,type Carry,fridge,finishSources,syrupKeys,toppingSources,miniRack} from './station-layout.ts'
import {frontHot} from './hot-appliance.ts'
import {rear,rearFood,rearOven,rearPress} from './rear-layout.ts'
import {FixedClock} from '../sim/clock.ts'
import {CafeAudio} from './audio.ts'
import type {Tuning} from '../content/model.ts'

const el=<T extends HTMLElement=HTMLElement>(s:string)=>document.getElementById(s) as T
const tag=<K extends keyof HTMLElementTagNameMap>(s:K,text='',cls='')=>{const n=document.createElement(s);n.textContent=text;n.className=cls;return n}
function button(text:string,fn:()=>void,title=text){const n=tag('button',text);n.title=title;n.setAttribute('aria-label',title);n.onclick=fn;return n}
async function data<T>(p:string):Promise<T>{const r=await fetch('/data/'+p+'.json');if(!r.ok)throw Error(p+' unavailable');return r.json()}
type Panel='Espresso'|'Cups'|'Drinks'|'Food'|'Service'|'Portafilter'|'Kitchen'
const labelLane=(i:number)=>String.fromCharCode(65+i)
async function open(){
 const [base,tuning,art]=await Promise.all([data<Config>('counter'),data<Tuning>('tuning'),workstation(el<HTMLCanvasElement>('painting'))])
 const progress=loadProgress(),music=new CafeAudio(),clock=new FixedClock(),dialog=el<HTMLDialogElement>('dialog'),area=el<HTMLSelectElement>('area')
 let level=piazzaShift,cfg=levelConfig(base,level,progress.ranks),g=new Bench(cfg,tuning),head=0,panel:Panel='Espresso',paused=false,endShown=false,sound=true,last=0,signature='',ticketKey='',hintUntil=0,uiTick=-1
 let drag:{id:number;x:number;y:number;carry:Carry;source:HTMLElement;active:boolean}|null=null,over:HTMLElement|null=null
 let skip:HTMLElement|null=null
 const guide=recipeGuide(el('recipe-focus'),el('recipe-index'),el('book-scroll'),art.shotIcon,end=>act({action:'to',view:end}))
 let bookOpen=false,assist=false
 try{assist=localStorage.getItem('via-bianca-controls')==='on'}catch{}
 function layout(){
  el('app').dataset.rail=bookOpen||assist?'open':'closed'
  el('app').dataset.railKind=bookOpen?'recipes':assist?'controls':'none'
  el('control-rail').hidden=!assist||bookOpen;el('recipe-rail').hidden=!bookOpen
  el('recipes').setAttribute('aria-expanded',String(bookOpen))
  if(bookOpen)guide.update(g)
 }
 function toggleBook(open:boolean){if(open===bookOpen)return;cancelViewportGestures();if(open&&sound)music.unlock();bookOpen=open;layout()}
 const canvas=el<HTMLCanvasElement>('painting'),world=el('world'),surface=el('surface')
 let visible={x:0,y:0,w:stage.w,h:stage.h}
 let tuningLayers=false
 const tuner=layerTuner(()=>draw(g,0,head),()=>stopTuning())
 let lastScene:ViewRect|null=null,lastFrame:ViewRect|null=null
 function sizeCanvas(){
  const scene=world.getBoundingClientRect(),frame=surface.getBoundingClientRect()
  if(!lastScene||!lastFrame){lastScene=scene;lastFrame=frame}
  else if(viewportMoved(lastScene,scene)||viewportMoved(lastFrame,frame)){cancelViewportGestures();lastScene=scene;lastFrame=frame}
  const region=visibleStage(scene,frame,stage);if(!region)return
  const {width,height,...bounds}=region;visible=bounds
  Object.assign(canvas.style,{left:visible.x/stage.w*100+'%',top:visible.y/stage.h*100+'%',width:visible.w/stage.w*100+'%',height:visible.h/stage.h*100+'%'})
  const density=Math.min(devicePixelRatio||1,1.75),w=Math.max(1,Math.round(width*density)),h=Math.max(1,Math.round(height*density))
  if(canvas.width!==w)canvas.width=w
  if(canvas.height!==h)canvas.height=h
 }
 const travel=counterTravel(surface,()=>g.view,()=>!!drag||paused||!!g.turn||g.done,to=>act({action:'to',view:to}))
 const draw=(game:Bench,frac:number,group:number)=>{
  if(tuningLayers){
   const preview=previewBench(game,tuner.selected,tuner.state)
   if(tuner.view!=='current'){preview.kitchen=tuner.view==='Kitchen';if(tuner.view!=='Kitchen')preview.end=tuner.view}
   art.draw(preview,0,group,visible,null,null,{map:tuner.map,selected:tuner.selected,state:tuner.state});return
  }
  art.draw(game,frac,group,visible,drag?.active?drag.carry:null,travel.frame(game.turn?.to))
  const target=document.getElementById('loose-handle')
  if(target){
   const pose=filterPose(game,game.tick+frac)
   target.style.left=(pose.x-23)/stage.w*100+'%';target.style.top=(pose.y-13)/stage.h*100+'%'
  }
 }
 // Size and position can change on rotation, browser chrome, safe areas or a rail toggle.
 const refreshViewport=()=>{sizeCanvas();draw(g,0,head)}
 const viewportObserver=new ResizeObserver(refreshViewport)
 viewportObserver.observe(world);viewportObserver.observe(surface)
 window.addEventListener('resize',refreshViewport)
 window.visualViewport?.addEventListener('resize',refreshViewport)
 window.visualViewport?.addEventListener('scroll',refreshViewport)
 document.addEventListener('fullscreenchange',refreshViewport)
 function pullAt(h:number,type:'short'|'standard'){
  head=h;const lane=g.freePitcher(h)
  if(lane<0){say('Both pitchers already hold a shot');return}
  act({action:'pull',head:h,lane,shot:type})
 }
 const options:Panel[]=['Espresso','Cups','Drinks','Food','Service','Portafilter','Kitchen']
 const panelNames:Record<Panel,string>={Espresso:'Espresso machine',Cups:'Cup rack',Drinks:'Milk & drinks',Food:'Bakery & grill',Service:'Guest service',Portafilter:'Portafilter bench',Kitchen:'Kitchen equipment'}
 for(const p of options){const o=tag('option',panelNames[p]);o.value=p;area.append(o)}
 function choose(p:Panel){panel=p;area.value=p;signature='';renderControls();el('controls').scrollTop=0}
 area.onchange=()=>choose(area.value as Panel)
 function say(s:string){el('feedback').textContent=s;hintUntil=g.tick+g.ticks(3.5)}
 function act(cmd:Input){
  if(paused||g.done)return
  clearPick();offered=null;placingPesto=false
  if(cmd.action!=='select')hidePeek();music.unlock();const count=g.events.length,old=g.coins,view=g.view
  const msg=g.command(cmd);say(msg)
  if(g.events.length!==count){
   const cues={bankShots:'rack-load',parkShot:'rack-load',moveOrange:'rack-load',serviceGroup:'handle-release',purge:'hot-water',refillMilk:'drawer',cup:'ceramic',returnCup:'ceramic',returnBrownie:'ceramic',trash:'bin',beans:'beans',release:'handle-release',grind:'dose-fill',dose:'dose-fill',compact:'compactor',load:'rack-load',sandwich:'board-set',pesto:'spread',press:'press-latch',oven:'oven-door',heat:'oven-door',drawer:'drawer',washRun:'wash',restock:'drawer',refillIce:'ice-clink'} as const
   const cue=cues[cmd.action as keyof typeof cues];if(sound&&cue)music.cue(cue);if(sound&&cmd.action==='restockAll')music.restockSound()
   if(old<g.coins&&sound)music.cue('finish')
  }
  if(g.coins>old){
   const payment=g.lastPayment!
   say(cfg.orders[payment.guest].name+' paid '+payment.price+' · '+payment.tip+' tip'+(payment.bonus?' · '+payment.bonus+' combo':''))
  }
  if(cmd.action==='to'&&view!==cmd.view){endDrag();hidePeek();signature=''}
  sync();draw(g,0,head)
 }
 const availableGuests=()=>g.guests.flatMap((v,i)=>v.state==='waiting'&&cfg.orders[i].end===g.view?[i]:[])
 const selectedCup=()=>g.cups[g.selected]
 const phaseAction=():Input=>{
  const next:Record<typeof g.basket,Input>={mounted:{action:'serviceGroup',head},released:{action:'pick'},held:{action:'knock'},knocking:{action:'knock'},clean:{action:'pick'},emptyHeld:{action:'grind'},grinding:{action:'grind'},dosed:{action:'attach',head:g.serviceHead},dosedHeld:{action:'attach',head:g.serviceHead},atTamp:{action:'attach',head:g.serviceHead},tamping:{action:'attach',head:g.serviceHead},tamped:{action:'attach',head:g.serviceHead},attached:{action:'lock'},locking:{action:'lock'}}
  return next[g.basket]
 }
 function dock(action:'knock'|'grind'){
  if(action==='knock'&&g.basket==='released'||action==='grind'&&g.basket==='clean')act({action:'pick'})
  act({action})
 }
 function phaseName(){if(g.assistedService&&!['attached','locking'].includes(g.basket))return g.basket==='grinding'?'Grinding…':g.basket==='clean'&&g.beans<cfg.capacity.basketDoses&&!g.bags?'No beans remaining':g.basket==='dosedHeld'?'Returning portafilter…':'Automatic service…';return ({mounted:'Release spent handle',released:'Lift spent handle',held:'Knock out puck',knocking:'Knocking…',clean:'Lift clean handle',emptyHeld:'Dock at grinder',grinding:'Grinding…',dosed:'Attach pre-tamped handle',dosedHeld:'Attach pre-tamped handle',atTamp:'Attach pre-tamped handle',tamping:'Attach pre-tamped handle',tamped:'Attach pre-tamped handle',attached:'Click to lock',locking:'Locking…'})[g.basket]}

 type PourSource=Extract<Carry,{kind:'pot'|'add'}>
 let picked:PourSource|null=null
 function pick(source:PourSource,name:string){
  if(source.kind!=='add'||source.add!=='ice')art.stopIce()
  picked=source
  el('world').classList.add('choosing-cup')
  say(name+(source.kind==='pot'&&source.head!==reserveHead?' · tap a cup or a reserve pocket':' · tap a cup to pour'))
 }
 function clearPick(keepIce=false){if(!keepIce)art.stopIce();picked=null;el('world').classList.remove('choosing-cup')}
 function shot(h:number,lane:number,to?:number){
  if(h!==reserveHead)head=h
  if(to===undefined){pick({kind:'pot',head:h,lane},g.pitcherBank(h)?.[lane]==='short'?'Short shot':'Standard shot');return}
  act({action:'dropPour',pour:{action:'pour',head:h,lane,slot:to}})
 }
 function stageShot(source:{head:number;lane:number},preferred?:number){
  const free=(i:number)=>g.shotReserve[i]===null&&!g.pouringFrom('transfer',reserveHead,i)
  const pocket=chooseShotPocket(g.shotReserve.length,free,preferred)
  if(pocket<0){say(preferred===undefined?'Shot reserve full':'Choose an empty shot pocket');return}
  act({action:'parkShot',head:source.head,lane:source.lane,pocket})
 }
 function focusHead(h:number){clearPick();head=h;choose('Espresso')}
 function startScoop(){
  if(g.ice<=0||g.pouringFrom('ice')||g.done)return false
  if(art.beginIce()&&sound){music.unlock();music.cue('ice-scrape')}
  return true
 }
 function applyIngredient(add:Add,slot?:number,pitcher?:number){
  if(add==='ice'){
   if(slot===undefined&&!startScoop()){say(g.ice<=0?'Refill the ice well':'Scoop in use');return}
   if(slot!==undefined){art.setIcePortions(icePortions(g.cups[slot]?.size??'Medium',cfg.capacity.largePortions));art.releaseIce(g,slot)}
  }
  if(slot===undefined){pick({kind:'add',add,pitcher},cfg.finishes[add]);return}
  act({action:'dropPour',pour:{action:'add',add,slot,pitcher}})
 }
 type Handoff={kind:'cup'|'food';slot:number}
 let offered:Handoff|null=null
 let placingPesto=false
 function itemAction(kind:Handoff['kind'],slot:number){
  const matches=availableGuests().filter(i=>g.canServe(i,kind,slot,true))
  offered=null
  if(matches.length===1){act({action:'serve',kind,slot,guest:matches[0]});return}
  act({action:kind==='cup'?'select':'food',slot})
  if(matches.length>1){offered={kind,slot};say('Choose a guest for this '+(kind==='cup'?'drink':'pastry'));tickets()}
 }
 function cupAction(slot:number){
  const source=picked
  if(source){
   if(!g.cups[slot]){say('Place a cup here first.');return}
   drop(source,'saucer/'+slot);return
  }
  itemAction('cup',slot)
 }
 function fillCup(index:number,slot?:number){const b=holders[index];act({action:g.drawer&&takeCup(b.cup)?'restock':'cup',cup:b.cup,size:b.size,slot} as Input)}
 function endDrag(){over?.classList.remove('drop-over');over=null;drag=null;el('ghost').hidden=true}
 function attach(n:HTMLElement,carry?:Carry,dest?:string){if(carry)n.dataset.carry=JSON.stringify(carry);if(dest)n.dataset.to=dest;return n}
 function drop(c:Carry,target:string){
  const [kind,index]=target.split('/'),i=Number(index)
  if(c.kind==='cup'&&kind==='waterSpout'){act({action:'dropPour',pour:{action:'add',add:'water',slot:c.slot}});return true}
  if(c.kind==='juicePitcher'&&(kind==='juiceSeat'||kind==='juiceDock')){act({action:'moveOrange',from:c.from,to:kind==='juiceDock'?-1:i});return true}
  if(c.kind==='supply'&&kind===c.station){act({action:c.station==='oven'?'load':'sandwich',slot:index===undefined?undefined:i,dragged:true});return true}
  if(c.kind==='pesto'&&kind==='press'){act({action:'pesto',slot:index===undefined?undefined:i});return true}
  if(c.kind==='pot'&&kind==='shotPocket'){stageShot(c,index===undefined?undefined:i);return true}
  if(c.kind==='bakedSlot'&&kind==='foodWell'){act({action:'bankHot',station:c.station,slot:c.slot,dragged:true});return true}
  if(c.kind==='bakedSlot'&&kind==='towel'){act({action:c.station,slot:c.slot,towelSlot:i,dragged:true});return true}
  if(kind==='saucer'){if(c.kind==='pot')shot(c.head,c.lane,i);else if(c.kind==='holder')fillCup(c.index,i);else if(c.kind==='add')applyIngredient(c.add,i,c.pitcher);else return false;return true}
  if(kind==='guest'&&(c.kind==='cup'||c.kind==='food')){act({action:'serve',kind:c.kind,slot:c.slot,guest:i});return true}
  if(kind==='bin'&&(c.kind==='cup'||c.kind==='food'||c.kind==='pot')){act({action:'trash',target:c.kind==='pot'?{kind:'shot',head:c.head,lane:c.lane,slot:0}:{kind:c.kind==='cup'?'drink':'food',slot:c.slot}});return true}
  if(kind==='holder'&&c.kind==='cup'){const b=holders[i];act({action:'returnCup',slot:c.slot,cup:b.cup,size:b.size});return true}
  if(kind==='brownie'&&c.kind==='food'){act({action:'returnBrownie',slot:c.slot});return true}
  if(c.kind==='beans'&&kind==='grinder'){act({action:'beans',bag:c.bag});return true}
  if(c.kind==='handle'){
   if(kind==='knock'&&g.basket==='mounted'&&c.head!==undefined)act({action:'release',head:c.head})
   if(kind==='knock'&&g.basket==='released')act({action:'pick'})
   if(kind==='grinder'&&g.basket==='clean')act({action:'pick'})
   if(kind==='head'&&i!==g.serviceHead){say('Return this handle to group '+(g.serviceHead+1));return true}
   if(kind==='head'){act({action:'attach',head:i});return true}
   if(kind==='knock'||kind==='grinder'){act({action:kind==='knock'?'knock':'grind'});return true}
  }
  return false
 }
 const app=el('app')
 const peek=el('cup-peek')
 let peekSlot=-1,peekUid=-1,peekKey='',held=false,holdTimer=0
 function cancelHold(){window.clearTimeout(holdTimer);holdTimer=0}
 function hidePeek(){cancelHold();peek.hidden=true;peekSlot=-1;peekUid=-1;peekKey=''}
 function refreshPeek(){
  if(peekSlot<0)return
  const c=g.cups[peekSlot]
  if(!c||c.uid!==peekUid||paused||g.turn||g.kitchen){hidePeek();return}
  const key=JSON.stringify(c)+String(!!g.pouringAt(peekSlot))
  if(key===peekKey)return
  peekKey=key
  const id=!!g.pouringAt(peekSlot)?undefined:g.recipe(c)
  const ingredients=[...(c.poured&&c.shot?[c.shot==='short'?'Short shot':'Standard shot']:[]),...c.add.map(a=>cfg.finishes[a])]
  el('peek-name').textContent=id?cfg.recipes[id].name:ingredients.length?'In progress':'Empty cup'
  el('peek-vessel').textContent=[takeCup(c.cup)?ounces(c.size):'',cfg.cups[c.cup],c.lid?'Lidded':''].filter(Boolean).join(' · ')
  el('peek-contents').textContent=ingredients.join(' · ')||'Nothing poured yet'
  art.overhead(el<HTMLCanvasElement>('peek-art'),c)
 }
 function inspectCup(n:HTMLElement){
  if(paused||g.turn||g.kitchen)return
  const i=Number(n.dataset.to?.split('/')[1]),c=g.cups[i];if(!c)return
  peekSlot=i;peekUid=c.uid;peek.hidden=false;refreshPeek()
  const r=n.getBoundingClientRect(),w=peek.offsetWidth,h=peek.offsetHeight
  peek.style.left=Math.max(6,Math.min(innerWidth-w-6,r.left+r.width/2-w/2))+'px'
  peek.style.top=Math.max(5,r.top-h-9>4?r.top-h-9:Math.min(innerHeight-h-5,r.bottom+8))+'px'
 }
 function cupTarget(e:Event){return (e.target as HTMLElement).closest<HTMLElement>('[data-to^="saucer/"][data-carry]')}
 app.addEventListener('pointerover',e=>{const n=cupTarget(e);if(n&&e.pointerType==='mouse'&&!drag)inspectCup(n)})
 app.addEventListener('pointerout',e=>{const n=cupTarget(e);if(n&&e.pointerType==='mouse'&&!n.contains(e.relatedTarget as Node|null))hidePeek()})
 app.addEventListener('focusin',e=>{const n=cupTarget(e);if(n?.matches(':focus-visible'))inspectCup(n)})
 app.addEventListener('focusout',e=>{if(cupTarget(e))hidePeek()})
 app.addEventListener('contextmenu',e=>{if(cupTarget(e))e.preventDefault()})
 app.addEventListener('pointerdown',e=>{if(e.isPrimary&&cancelledLayoutPointer!==null){cancelledLayoutPointer=null;skip=null}if(drag||paused||g.turn||!e.isPrimary||e.button!==0)return;const n=(e.target as HTMLElement).closest<HTMLElement>('[data-carry]');if(!n)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,carry:JSON.parse(n.dataset.carry!),source:n,active:false};n.setPointerCapture(e.pointerId);held=false
  if(drag.carry.kind==='add'&&drag.carry.add==='ice')startScoop()
  if(e.pointerType!=='mouse'&&cupTarget(e))holdTimer=window.setTimeout(()=>{if(drag&&!drag.active){held=true;inspectCup(n)}},340)
 })
 app.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return
  if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<6)return
  if(held)return;hidePeek()
  const ice=drag.carry.kind==='add'&&drag.carry.add==='ice'
  if(ice){const box=world.getBoundingClientRect();art.moveIce((e.clientX-box.left)*stage.w/box.width,(e.clientY-box.top)*stage.h/box.height)}
  const ghost=el('ghost');if(!drag.active){clearPick(ice);drag.active=true;const sprite=art.carried(drag.carry,g);const scale=world.getBoundingClientRect().width/stage.w;ghost.style.width=sprite.logicalWidth*scale+'px';ghost.style.height=sprite.logicalHeight*scale+'px';ghost.replaceChildren(sprite.canvas);ghost.hidden=ice;draw(g,0,head)}
  ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'
  const dest=dropTarget(drag.carry,e.clientX,e.clientY,e.pointerType==='mouse'?0:12,(item,dest)=>canDrop(g,item,dest));if(ice){const slot=dest?.dataset.to?.startsWith('saucer/')?Number(dest.dataset.to.split('/')[1]):-1;art.setIcePortions(icePortions(g.cups[slot]?.size??'Medium',cfg.capacity.largePortions))}if(dest!==over){over?.classList.remove('drop-over');over=dest;over?.classList.add('drop-over')}
 })
 app.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;sizeCanvas();if(!drag){releaseLayoutPointer(e);return}cancelHold();if(held){held=false;skip=drag.source;setTimeout(()=>{skip=null},400);hidePeek();endDrag();return}const d=drag,dest=dropTarget(d.carry,e.clientX,e.clientY,e.pointerType==='mouse'?0:12,(item,dest)=>canDrop(g,item,dest))?.dataset.to
  endDrag()
  if(d.active){
   skip=d.source;setTimeout(()=>{skip=null},0)
   if(dest){
    if(dest.startsWith('saucer/')&&(d.carry.kind==='pot'||d.carry.kind==='add'&&d.carry.add!=='ice')){
     const box=world.getBoundingClientRect()
     art.releaseIngredient(g,Number(dest.split('/')[1]),d.carry,(e.clientX-box.left)*stage.w/box.width,(e.clientY-box.top)*stage.h/box.height)
    }
    drop(d.carry,dest)
   }else say('Returned to its place')
   if(d.carry.kind==='add'&&d.carry.add==='ice')art.stopIce()
  }})
 function abortGesture(){art.stopIce();held=false;hidePeek();endDrag()}
 // A layout change must not reinterpret an in-flight release against moved targets.
 let cancelledLayoutPointer:number|null=null,cancelledNavPointer:number|null=null
 function cancelViewportGestures(){
  if(drag){cancelledLayoutPointer=drag.id;skip=drag.source;abortGesture()}else hidePeek()
  if(navDrag){cancelledNavPointer=navDrag.id;cancelNav()}
  travel.cancelForLayout()
 }
 function releaseLayoutPointer(e:PointerEvent){
  if(e.pointerId===cancelledNavPointer){cancelledNavPointer=null;navSuppress=performance.now()+350}
  if(e.pointerId!==cancelledLayoutPointer)return
  cancelledLayoutPointer=null;const source=skip
  setTimeout(()=>{if(skip===source&&cancelledLayoutPointer===null)skip=null},400)
 }
 window.addEventListener('pointerup',releaseLayoutPointer,true)
 window.addEventListener('pointercancel',releaseLayoutPointer,true)
 app.addEventListener('pointercancel',e=>{cancelOwnedPointer(drag,e.pointerId,abortGesture)})
 app.addEventListener('lostpointercapture',e=>{cancelOwnedPointer(drag,e.pointerId,abortGesture)})
 window.addEventListener('blur',abortGesture)
 app.addEventListener('click',e=>{if(skip&&skip.contains(e.target as Node)){e.preventDefault();e.stopImmediatePropagation()}},true)

 type Action={label:string;fn:()=>void;off?:boolean;on?:boolean;carry?:Carry;dest?:string;aria?:string}
 const a=(label:string,fn:()=>void,more:Partial<Action>={}):Action=>({label,fn,...more})
 function renderControls(){
  if(drag||!assist||bookOpen)return
  const cc=el('controls'),group=g.groups[head],cup=selectedCup()
  const serial=JSON.stringify([panel,head,g.view,g.basket,g.groups.map(h=>[h.pulls,h.pots,h.extraction?.lane]),g.pour?.slot,g.selected,g.source,g.foodIndex,g.cups,g.towel,g.drawer,g.bags,g.beans,g.ice,g.milk,g.milkTank,g.milkReserve,g.textures.airy,g.groups.map(h=>[h.dirty,!!h.flush]),!!g.steamJobs.silky,!!g.steamJobs.airy,g.raw,g.warm,!!g.bake,g.pressState,g.microReady,!!g.microwave,g.teaReady,g.blendReady,!!g.brew,!!g.blend,g.teaStock,g.blendStock,g.orangeStock,g.orangeDock,...g.orangeReserve,!!g.citrus,g.stock,g.reserve,g.lidStock,g.lidReserve,g.dirty.length,g.washRack.length,!!g.wash,g.washed,availableGuests(),g.serviceHead,g.pressSlots.map(s=>s.state),g.ovenSlots.map(s=>s.state)])
  if(serial===signature)return;signature=serial
  const body=document.createDocumentFragment()
  const row=(...actions:Action[])=>{const r=tag('div','','row');for(const item of actions){const n=button(item.label,item.fn,item.aria??item.label);n.disabled=!!item.off;if(item.on)n.setAttribute('aria-pressed','true');attach(n,item.carry,item.dest);r.append(n)}body.append(r)}
  const cap=(s:string)=>body.append(tag('div',s,'caption'))
  const command=(label:string,cmd:Input,more:Partial<Action>={})=>a(label,()=>act(cmd),more)
  const saucers=()=>row(...g.cups.map((c,i)=>a((i+1)+' · '+(c?g.label(c):'Empty'),()=>cupAction(i),{on:i===g.selected&&g.source==='cup',dest:'saucer/'+i,carry:c?{kind:'cup',slot:i}:undefined})))
  function inspectSelected(){
   const target=el('targets').querySelector<HTMLElement>('[data-to="saucer/'+g.selected+'"]')
   if(!target)return
   if(!peek.hidden&&peekSlot===g.selected)hidePeek();else inspectCup(target)
  }
  if(cup&&!g.kitchen)row(a('Inspect cup '+(g.selected+1),inspectSelected))
  if(panel==='Espresso'){
   for(const [h,unit] of g.groups.entries()){
    cap('Group '+(h+1)+' · '+unit.pulls+' pulls')
    const busy=!!unit.extraction||!unit.pulls||g.freePitcher(h)<0||unit.dirty
    row(...(['short','standard'] as const).map(type=>a(type==='short'?'Short shot':'Standard',()=>pullAt(h,type),{off:busy,aria:'Pull '+type+' shot on group '+(h+1)})))
    if(unit.extraction||unit.pots.some(Boolean))row(...unit.pots.map((pot,l)=>{
     const running=unit.extraction?.lane===l?unit.extraction.shot:null
     const word=pot??running
     const label=word==='short'?'Short':word==='standard'?'Standard':'Empty'
     return a(labelLane(l)+' · '+label,()=>pot?shot(h,l):focusHead(h),{aria:'G'+(h+1)+' '+labelLane(l)+' '+label,carry:pot?{kind:'pot',head:h,lane:l}:undefined,off:!!running})
    }))
   }
   row(a('Basket · G'+(head+1),()=>choose('Portafilter')),a('Cup rack',()=>choose('Cups')))
  }else if(panel==='Portafilter'){
   cap('Group '+((g.basket==='mounted'?head:g.serviceHead)+1)+' · '+g.basket)
   if(g.groups[g.serviceHead].dirty)row(command(g.groups[g.serviceHead].flush?'Rinsing…':'Purge group '+(g.serviceHead+1),{action:'purge',head:g.serviceHead}))
   row(command(phaseName(),phaseAction(),{off:!!g.grind||!!g.basketCycle||g.assistedService&&g.basket!=='attached'||g.basket==='mounted'&&group.pulls>0}))
   row(command('Refill hopper · '+g.bags,{action:'beans'},{off:!!g.beans}),a('Espresso',()=>choose('Espresso')))
  }else if(panel==='Cups'){
   saucers();cap(g.drawer?'Refill takeaway holders':'Takeaway')
   for(const cupType of ['paper','clear'])row(...holders.flatMap((v,i)=>v.cup===cupType?[a(ounces(v.size)+' '+cupType,()=>fillCup(i),{carry:{kind:'holder',index:i},dest:'holder/'+i})]:[]))
   row(...lidSeats.map(s=>command(s.label,g.drawer?{action:'restockLid',material:s.cup}:{action:'lid',material:s.cup})))
   cap('Dine in');const ceramics=holders.flatMap((v,i)=>takeCup(v.cup)?[]:[a(cfg.cups[v.cup],()=>fillCup(i),{carry:{kind:'holder',index:i},dest:'holder/'+i})]);for(let i=0;i<ceramics.length;i+=2)row(...ceramics.slice(i,i+2))
   row(command('Refill takeaway cups & lids',{action:'restockAll'}),a('Espresso',()=>choose('Espresso')))
  }else if(panel==='Drinks'){
   saucers()
   cap('Milk tank · '+g.milkTank+' / '+cfg.capacity.milkTank)
   row(command('Make silky',{action:'steam',texture:'silky'},{off:!!g.steamJobs.silky||!g.milkTank||g.milk>=cfg.capacity.milkBatch}),command('Make airy',{action:'steam',texture:'airy'},{off:!!g.steamJobs.airy||!g.milkTank||g.textures.airy>=cfg.capacity.milkBatch}))
   row(command('Milk fridge · '+Math.ceil(g.milkReserve/cfg.capacity.carton),{action:'refillMilk'}),command('Lid',{action:'lid'}))
   row(command(g.citrus?'Pressing oranges…':'Run citrus press',{action:'citrus'},{off:!!g.citrus||g.orangeDock!==0}))
   const ingredients: [Add,string][]=[['water','Hot water'],['milk','Pour silky · '+g.milk],['foam','Pour airy · '+g.textures.airy],['coldmilk','Cold milk · '+g.milkReserve],['cocoa','Chocolate'],['matcha','Matcha'],['caramel','Salted caramel'],['vanilla','Vanilla'],['cherry','Amarena cherry'],['orange','Orange juice · '+g.orangeStock],['ice','Ice · '+g.ice],['tea','Tea · '+g.teaStock],['cold','Frappé · '+g.blendStock]]
   ingredients.push(...toppingKeys.map((id):[Add,string]=>[id,cfg.finishes[id]]))
   const actions=ingredients.map(([id,name])=>a(name,()=>applyIngredient(id),{off:id==='milk'&&(!g.milk||!!g.steamJobs.silky)||id==='foam'&&(!g.textures.airy||!!g.steamJobs.airy),carry:{kind:'add',add:id}}))
   for(let i=0;i<actions.length;i+=2)row(...actions.slice(i,i+2));if(g.ice<g.data.capacity.ice)row(command('Refill ice well',{action:'refillIce'}))
  }else if(panel==='Food'||panel==='Kitchen'){
   {
    row(command(g.brew?'Steeping…':g.teaReady?'Collect tea':'Steep tea',{action:'tea'}),command(g.blend?'Blending…':g.blendReady?'Collect base':'Blend base',{action:'blend'}))
    if(g.kitchen)row(command('Load dish · '+g.dirty.length,{action:'washLoad'}),command(g.washed?'Unload rack':g.wash?'Washing…':'Wash · '+g.washRack.length,{action:'washRun'}))
   }
   row(command('Load cornetto',{action:'load'}),command(g.warm?'Collect · '+g.warm:g.bake?'Baking…':'Bake · '+g.raw,{action:'oven'}))
   row(command('Load panino',{action:'sandwich'}),command('Add pesto',{action:'pesto'}))
   row(command(g.pressState==='ready'?'Collect panino':g.press?'Grilling…':'Close press',{action:'press'}),command('Take brownie',{action:'brownie'}))
   if(!g.kitchen)row(command(g.microReady?'Collect warmed':g.microwave?'Warming…':'Warm cornetto',{action:'heat'}))
   row(...g.towel.map((f,i)=>command(f?cfg.foods[f.food].name:'Space '+(i+1),{action:'food',slot:i},{on:g.source==='food'&&g.foodIndex===i,carry:f?{kind:'food',slot:i}:undefined})))
  }else{
   saucers();row(...g.towel.map((f,i)=>command(f?cfg.foods[f.food].name:'Food '+(i+1),{action:'food',slot:i},{carry:f?{kind:'food',slot:i}:undefined,on:g.source==='food'&&g.foodIndex===i})))
   cap('Guests at '+g.end);for(const i of availableGuests())row(command('Serve '+cfg.orders[i].name,{action:'guest',guest:i},{dest:'guest/'+i}))
   row(command('Lid cup',{action:'lid'}))
   if(cup||g.foodAt(g.foodIndex))row(command('Discard selected',{action:'discard'},{dest:'bin'}))
  }
  cc.replaceChildren(body)
 }

 let hotKey=''
 function hotspots(){
  const key=[g.binLoad,...g.shotReserve,...g.foodReserve.map(f=>f?.food),!!g.compacting,g.bags,...holders.map(b=>g.stock[stockKey(b.cup,b.size)]),...Object.values(g.lidStock),...Object.values(g.lidReserve),g.view,!!g.steamJobs.silky,!!g.steamJobs.airy,g.milkTank,g.textures.airy,g.textures.silky,g.cups[g.selected]?.size,g.groups.map(v=>[v.dirty,!!v.flush,v.extraction?.shot,v.extraction?.lane,v.pulls]),!!g.pour,g.tick===0,!!g.fridgeDoor,!!g.milkRefill,!!g.turn,g.basket,g.serviceHead,g.selected,g.groups.map(h=>h.pots.join('-')).join('/'),g.cups.map(c=>c?.uid),g.towel.map(f=>f?.food),g.drawer,g.ice,!!g.iceRefill,g.teaStock,g.blendStock,g.orangeStock,g.orangeDock,...g.orangeReserve,!!g.citrus,g.teaReady,g.blendReady,g.warm,g.overbaked,g.ovenSlots.map(s=>g.hotUrgent(s)),g.pressSlots.map(s=>g.hotUrgent(s)),placingPesto,...g.ovenSlots.map(s=>s.state),...g.pressSlots.map(s=>s.state+Number(s.pesto)+Number(!!s.pestoJob))].join('|')
  if(key===hotKey||drag)return;hotKey=key
  const target=el('targets');target.replaceChildren();if(g.turn)return
  function hit(name:string,x:number,y:number,w:number,h:number,fn:()=>void,carry?:Carry,dest?:string){
   const n=button('',fn,name);n.className='hot';Object.assign(n.style,{left:(x-w/2)/stage.w*100+'%',top:(y-h/2)/stage.h*100+'%',width:w/stage.w*100+'%',height:h/stage.h*100+'%'});attach(n,carry,dest);target.append(n);return n
  }
  function foodSlots(atRear:boolean){
   g.towel.forEach((f,i)=>{
    if(!atRear&&!f)return
    const pos=atRear?{x:rearFood[i].x,y:rearFood[i].y-17,w:126,h:80}:towelTouch(i,g.towel.length)
    hit('Food space '+(i+1),pos.x,pos.y,pos.w,pos.h,()=>itemAction('food',i),f?{kind:'food',slot:i}:undefined,'towel/'+i)
   })
  }
  function passStations(){
   const step=servicePass.shots
   for(const rack of shotRackBezelTouch())hit('Shot reserve · '+g.shotReserve.filter(Boolean).length+' of '+step.capacity,rack.x,rack.y,rack.w,rack.h,()=>{
    act({action:'bankShots'})
   },undefined,'shotPocket')
   for(const [i,stored] of g.shotReserve.entries()){
    const pt=shotPocketTouch(i)
    const content=stored==='short'?'short shot':stored==='standard'?'standard shot':'empty'
    const n=hit('Shot pocket '+(i+1)+' · '+content,pt.x,pt.y,pt.w,pt.h,()=>{
     if(picked?.kind==='pot'&&picked.head!==reserveHead){stageShot(picked,i);return}
     if(stored){shot(reserveHead,i);return}
     say('Tap a filled group pitcher, then an empty pocket ('+step.capacity+' total).')
    },stored?{kind:'pot',head:reserveHead,lane:i}:undefined,'shotPocket/'+i)
    n.title=stored?'Select '+content+' to pour':'Stage a shot here'
   }
   for(const [i,f] of g.foodReserve.entries()){
    const slot=i+g.towel.length
    const press=i<servicePass.panini.capacity
    const seat=foodWellTouch(press?'panini':'pastries',press?i:i-servicePass.panini.capacity)
    hit((press?'Panini':'Pastry')+' well '+(press?i+1:i+1-servicePass.panini.capacity)+' · '+(f?cfg.foods[f.food].name:'empty'),seat.x,seat.y,seat.w,seat.h,()=>{
     if(f)itemAction('food',slot)
     else say('Collect a cooked '+(press?'panino':'cornetto')+' here.')
    },f?{kind:'food',slot}:undefined,'foodWell/'+(press?'press':'oven'))
   }
  }
  function appliance(station:'oven'|'press',box:{x:number;y:number;w:number;h:number}){
   const oven=station==='oven',slots=oven?g.ovenSlots:g.pressSlots
   const name=oven?'Pastry oven':'Panini press'
   // Only the outer bezel owns the whole-machine shortcut; internal slot gutters are neutral.
   const geometry=applianceTouch(station,box,slots.length)
   for(const b of geometry.bezel)hit(name,b.x,b.y,b.w,b.h,()=>{if(!g.kitchen&&slots.some(s=>s.state==='ready'))act({action:'bankHot',station});else act({action:station})},undefined,station)
   for(const [i,slot] of slots.entries()){
    const {x:cx,y:cy,w:width,h:height}=geometry.slots[i]
    const location=oven?'Oven rack '+(i+1):'Press plate '+(i+1)
    const control=hit(location,cx,cy,width,height,()=>{
     if(placingPesto&&station==='press'){act({action:'pesto',slot:i});return}
     if(!g.kitchen&&slot.state==='ready')act({action:'bankHot',station,slot:i});else act({action:station,slot:i})
    },slot.state==='ready'?{kind:'bakedSlot',station,slot:i}:undefined,station+'/'+i)
    control.title=location+' · '+slot.state+(slot.pesto?' · pesto':'')
    control.setAttribute('aria-description',control.title)
    const status=slot.pestoJob?'':slot.state==='loaded'?(oven?'Bake':'Grill'):slot.state==='ready'?(g.hotUrgent(slot)?'Lift now':'Lift'):slot.state==='burnt'?'Clear':''
    if(status){
     const label=tag('span',status||'', 'slot-status')
     label.dataset.state=slot.state
     control.append(label)
    }
   }
  }
  function updatePesto(){
   const eligible=g.pressSlots.flatMap((s,i)=>s.state==='loaded'&&!s.pesto&&!s.pestoJob?[i]:[])
   if(eligible.length>1){placingPesto=true;say('Tap the plate that gets pesto.');return}
   act({action:'pesto',slot:eligible[0]})
  }
  const bin=g.kitchen?rear.bin:{x:475,y:849,w:142,h:174}
  const wasteBin=hit('Waste compactor',bin.x,bin.y,bin.w,bin.h,()=>act({action:'compact'}),undefined,'bin')
  wasteBin.title='Waste compactor · '+g.binLoad+' / '+cfg.capacity.bin
  if(g.binLoad)wasteBin.append(tag('span',g.compacting?'Cycling':(g.binLoad===cfg.capacity.bin?'Compact · ':'')+g.binLoad+'/'+cfg.capacity.bin,'compactor-readout'))
  if(g.kitchen){
   const rearHit=(name:string,box:typeof rear.tea,fn:()=>void,carry?:Carry,dest?:string)=>hit(name,box.x,box.y,box.w,box.h,fn,carry,dest)
   rearHit('Brew or collect tea',rear.tea,()=>act({action:'tea'}))
   rearHit('Blend or collect base',rear.blend,()=>act({action:'blend'}))
   for(const [box,station,label,action] of [[rear.load,'oven','Cornetti','load'],[rear.sandwich,'press','Panini','sandwich']] as const){
    const n=rearHit('Load '+(station==='oven'?'cornetto':'panino'),box,()=>act({action}),{kind:'supply',station})
    n.append(tag('span',label,'bin-plaque'))
   }
   rearHit('Add pesto',rear.pesto,updatePesto,{kind:'pesto'}).append(tag('span','Pesto','bin-plaque'))
   rearHit('Take brownie',rear.brownie,()=>act({action:'brownie'}),undefined,'brownie').append(tag('span','Brownies','bin-plaque'))
   appliance('oven',rearOven);appliance('press',rearPress)
   rearHit('Load dishwasher',rear.dishTub,()=>act({action:'washLoad'}))
   rearHit('Run or unload dishwasher',rear.wash,()=>act({action:'washRun'}))
   foodSlots(true);return
  }
  for(const [key,label,action] of [['tea','Tea brewer','tea'],['blend','Frappé blender','blend'],['pesto','Pesto','pesto']] as const){
   const b=frontGalley[key]
   const n=hit(label,b.x,b.y,b.w,b.h,action==='pesto'?updatePesto:()=>act({action}),key==='pesto'?{kind:'pesto'}:undefined)
   if((key==='tea'&&g.teaReady)||(key==='blend'&&g.blendReady))n.append(tag('span','Collect','station-ready'))
  }
  beanBags.forEach((bag,i)=>{const n=hit('Bean bag '+(i+1)+' · '+g.bagCounts[i],bag.x,bag.y-bag.h/2,85,bag.h,()=>act({action:'beans',bag:i}),{kind:'beans',bag:i});n.disabled=!g.bagCounts[i];n.append(tag('span',String(g.bagCounts[i]),'stock-count'))})
  hit('Grinder',255,329,105,170,()=>{choose('Portafilter');if(g.basket==='dosed')act({action:'dose'});else dock('grind')},g.basket==='dosed'?{kind:'handle'}:undefined,'grinder')
  const keycap=(name:string,copy:string,x:number,y:number,w:number,h:number,fn:()=>void,css:string,carry?:Carry)=>{
   const n=hit(name,x,y,w,h,fn,carry)
   const style=css.split(' ')
   const icon=style.includes('water-key')?'water':style.includes('brass-key')?'purge':
    style.includes('milk-key')||style.includes('milk-label')?(style.includes('airy')?'airy':'silky'):
    copy.endsWith('Standard')?'standard':copy.includes('Short')?'short':'empty'
   const portions=style.includes('milk-label')?Number(copy.split(' · ')[1])||0:undefined
   n.append(machineControl(icon,portions));n.title=name;n.className='machine-key tactile '+css
   return n
  }
  const espressoKey=keycap
  const service=g.groups[g.serviceHead]
  const purge=espressoKey('Purge exposed group',service.flush?'Rinsing':'Purge',49,466,48,44,()=>act({action:'purge',head:g.serviceHead}),'brass-key'+(service.dirty?' needed':''))
  purge.disabled=!service.dirty||!!service.flush
  for(const [h,x] of heads.entries()){
   const group=g.groups[h]
   for(const type of ['short','standard'] as const){
    const b=shotKeyTouch(h,type),compact=shotKeyTouch(h,type,true)
    const n=espressoKey('Group '+(h+1)+' '+type+' shot',type==='standard'?'Standard':'Short Shot',b.x,b.y,b.w,b.h,()=>pullAt(h,type),'shot-key '+type)
    n.style.setProperty('--group-x',compact.x/stage.w*100+'%')
    n.style.setProperty('--shot-top',(compact.y-compact.h/2)/stage.h*100+'%')
    n.style.setProperty('--shot-width',compact.w/stage.w*100+'%')
    n.style.setProperty('--shot-height',compact.h/stage.h*100+'%')
    n.disabled=!!group.extraction||group.pulls===0||g.freePitcher(h)<0||group.dirty
   }
   const spent=!group.pulls&&!group.extraction&&(g.basket==='mounted'||h!==g.serviceHead)
   const lockHere=g.basket==='attached'&&g.serviceHead===h
   const gripBox=portafilterTouch(h)
   const grip=hit('Group '+(h+1)+' portafilter',gripBox.x,gripBox.y,gripBox.w,gripBox.h,()=>{
    head=h;choose('Portafilter');act({action:'serviceGroup',head:h})
   },spent&&g.basket==='mounted'?{kind:'handle',head:h}:undefined,'head/'+h)
   if(spent||lockHere){
    grip.classList.add('service-needed')
    grip.title=spent?'Spent puck · tap to service':'Attached · tap to lock'
    grip.append(tag('span',spent?'↻':'↪','service-signal'))
   }
   for(let lane=0;lane<2;lane++){
    const pt=brewPoint(h,lane),pot=group.pots[lane],running=group.extraction?.lane===lane?group.extraction.shot:null,kind=pot??running
    const label=kind==='short'?'Short':kind==='standard'?'Standard':'Empty'
    const carry=pot?{kind:'pot' as const,head:h,lane}:undefined
    const pour=()=>{if(pot)shot(h,lane);else focusHead(h)}
    hit('Group '+(h+1)+' pitcher '+labelLane(lane),pt.x,pt.y-22,47,48,pour,carry)
    // Six legacy group/pitcher keys retired; the physical pitchers remain the controls.
   }
  }
  espressoKey('Dispense hot water','Hot water',480,466,44,44,()=>applyIngredient('water'),'water-key',{kind:'add',add:'water'})
  hit('Hot water spout',467,535,42,62,()=>applyIngredient('water'),{kind:'add',add:'water'},'waterSpout')
  hit('Knock box',78,690,130,60,()=>dock('knock'),undefined,'knock')
  if(!g.assistedService&&['released','held','clean','emptyHeld','dosedHeld'].includes(g.basket)){
   const n=hit('Loose portafilter',0,0,105,53,()=>{choose('Portafilter');act(phaseAction())},{kind:'handle'})
   n.id='loose-handle'
  }
  for(const texture of ['silky','airy'] as const){
   const pt=milkTouch(texture),kind=texture==='airy'?'foam':'milk',word=texture==='airy'?'Airy':'Silky'
   const working=!!g.steamJobs[texture]
   const make=keycap('Steam '+texture+' milk',word,pt.steam.x,pt.steam.y,pt.steam.w,pt.steam.h,()=>{choose('Drinks');act({action:'steam',texture})},'milk-key '+texture)
   make.disabled=working||!!g.pouringFrom(kind)||!g.milkTank||g.textures[texture]>=cfg.capacity.milkBatch

   const pourMilk=keycap('Pour '+texture+' pitcher',word+' · '+(working?'Steaming':g.textures[texture]),pt.pour.x,pt.pour.y,pt.pour.w,pt.pour.h,()=>applyIngredient(kind),'milk-label '+texture,{kind:'add',add:kind})
   const meter=tag('span','','dose-rail')
   for(let i=0;i<cfg.capacity.milkBatch;i++){const pip=tag('i');if(i<g.textures[texture])pip.classList.add('charged');meter.append(pip)}
   pourMilk.replaceChildren(meter)
   pourMilk.title=word+' · '+g.textures[texture]+' portions'
   pourMilk.disabled=working||!g.textures[texture]
   hit(word+' milk pitcher',pt.pitcher.x,pt.pitcher.y,pt.pitcher.w,pt.pitcher.h,()=>applyIngredient(kind),{kind:'add',add:kind})
  }
  const gauge=tag('span','Milk '+g.milkTank+' / '+cfg.capacity.milkTank,'tank-count')
  Object.assign(gauge.style,{left:1190/stage.w*100+'%',top:242/stage.h*100+'%'});target.append(gauge)
  for(const id of ['coldmilk',...syrupKeys] as const){const p=id==='coldmilk'?{...finishSources[id],y:finishSources[id].y-finishSources[id].h/2,w:58}:syrupTouch(id);hit(cfg.finishes[id],p.x,p.y,p.w,p.h,()=>applyIngredient(id),{kind:'add',add:id})}
  for(const id of toppingKeys){const p=toppingSources[id];hit(cfg.finishes[id],p.x,p.y-p.h/2,p.w,p.h,()=>applyIngredient(id),{kind:'add',add:id})}
  const citrus=citrusTouch()
  const run=citrus.run,jug=citrus.juice
  hit('Run citrus press',run.x,run.y,run.w,run.h,()=>act({action:'citrus'}))
  const juice=hit(g.orangeDock===null?'Empty citrus dock':g.orangeDock?'Filled juice pitcher · move to reserve':'Empty docked juice pitcher',jug.x,jug.y,jug.w,jug.h,()=>{
   if(g.orangeDock===null){const i=g.orangeReserve.findIndex((p,i)=>p===0&&g.canMoveOrange(i,-1));if(i>=0)act({action:'moveOrange',from:i,to:-1});else say('No empty pitcher available')}
   else if(g.orangeDock>0){if(g.canMoveOrange(-1,3))act({action:'moveOrange',from:-1,to:3});else say('Use the reserved orange juice first')}
   else act({action:'citrus'})
  },g.orangeDock!==null&&!g.citrus?{kind:'juicePitcher',from:-1}:undefined,'juiceDock')
  if(g.citrus)juice.append(tag('span','…','stock-count'))
  for(const [i,stock] of g.orangeReserve.entries()){
   if(i!==0&&i!==3)continue
   const b=juiceTouch(i),busy=g.pours.some(p=>p.action==='orange'&&p.lane===i)
   hit((i===0?'Empty pitcher reserve':'Orange juice reserve')+' · '+(stock===null?'open':stock===0?'empty pitcher':stock+' portions'),b.x,b.y,b.w,b.h,()=>{
    if(stock===null&&g.canMoveOrange(-1,i))act({action:'moveOrange',from:-1,to:i})
    else if(stock===0&&g.canMoveOrange(i,-1))act({action:'moveOrange',from:i,to:-1})
    else if(stock===0&&g.canMoveOrange(i,0))act({action:'moveOrange',from:i,to:0})
    else if(stock!==null&&stock>0&&!busy)applyIngredient('orange',undefined,i)
    else say('Move a filled pitcher here or dock an empty pitcher')
   },busy||stock===null?undefined:stock>0?{kind:'add',add:'orange',pitcher:i}:{kind:'juicePitcher',from:i},'juiceSeat/'+i)
  }
  hit('Milk fridge',fridge.x,fridge.y,fridge.w,fridge.h,()=>{choose('Drinks');act({action:'refillMilk'})})
  for(const kind of ['raw','panino'] as const){
   const station=kind==='raw'?'oven':'press',pt=frontSupplyTouch(kind)
   hit(kind==='raw'?'Cornetto supply box':'Panini supply box',pt.x,pt.y,pt.w,pt.h,()=>{choose('Food');act({action:kind==='raw'?'load':'sandwich'})},{kind:'supply',station})
  }
  for(const seat of miniRack){if(seat.food==='brownie'||seat.food==='madeleine'||seat.food==='cookie'||seat.food==='chips'){const food=seat.food;hit(cfg.foods[food].name,seat.x,seat.y-19,56,40,()=>{choose('Food');act({action:'snack',food})},undefined,food==='brownie'?'brownie':undefined)}}
  appliance('oven',frontHot.oven)
  hit('Microwave',1190,505,113,126,()=>{choose('Food');act({action:'heat'})})
  appliance('press',frontHot.press)
  const ice=hit(g.iceRefill?'Refilling ice well':g.ice?'Scoop ice · '+g.ice+' / '+cfg.capacity.ice:'Refill ice well',iceTouch.x,iceTouch.y,iceTouch.w,iceTouch.h,()=>{choose('Drinks');if(g.iceRefill)return;if(!g.ice)act({action:'refillIce'});else applyIngredient('ice')},g.ice&&!g.iceRefill?{kind:'add',add:'ice'}:undefined)
  ice.append(tag('span',g.ice+' / '+cfg.capacity.ice,'stock-count ice-count'))
  for(const [i,b] of holders.entries()){
   const travel=takeCup(b.cup),key=stockKey(b.cup,b.size)
   const stock=g.stock[key],name=(travel?ounces(b.size)+' ':'')+cfg.cups[b.cup]
   const bTouch=holderTouch(b,travel?cfg.capacity.takeaway:cfg.capacity.ceramic)
   const n=hit(name,bTouch.x,bTouch.y,bTouch.w,bTouch.h,()=>{choose('Cups');fillCup(i)},stock>0&&(!g.drawer||!travel)?{kind:'holder',index:i}:undefined,'holder/'+i)
   n.classList.add('cup-bin')
   n.setAttribute('aria-description',stock+' in rack'+(travel?', '+g.reserve[key]+' in reserve':''))
   n.title=name
  }
  for(const seat of lidSeats){const b=lidTouch(seat,g.lidCapacity),stock=g.lidStock[seat.cup];const n=hit(seat.label,b.x,b.y,b.w,b.h,()=>act(g.drawer?{action:'restockLid',material:seat.cup}:{action:'lid',material:seat.cup}));n.classList.add('cup-bin');n.setAttribute('aria-description',stock+' in rack');n.title=seat.label};hit('Refill takeaway cups and lids',883,916,520,47,()=>{choose('Cups');act({action:'restockAll'})})
  g.cups.forEach((c,i)=>{const b=saucerTouch(i,c);hit('Select saucer '+(i+1),b.x,b.y,b.w,b.h,()=>cupAction(i),c?{kind:'cup',slot:i}:undefined,'saucer/'+i)})
  foodSlots(false);passStations()
  for(const [add,count] of [['tea',g.teaStock],['cold',g.blendStock]] as const){
   const b=carafeTouch(add)
   const label=add==='tea'?'Brewed tea pitcher':'Blended frappé pitcher'
   const n=hit(label+(count?' · '+count+' portions':' · empty'),b.x,b.y,b.w,b.h,()=>{if(count)applyIngredient(add);else act({action:add==='tea'?'tea':'blend'})},count?{kind:'add',add}:undefined)
   if(count)n.append(tag('span',String(count),'stock-count'))
  }
 }
 const orderName=(i:number)=>{const o=cfg.orders[i],v=g.guests[i];return [o.drink&&!v.gotDrink?cfg.recipes[o.drink].name+(o.toppings?.length?' + '+o.toppings.map(t=>cfg.finishes[t]).join(', '):''):'',o.food&&!v.gotFood?cfg.foods[o.food].name:''].filter(Boolean).join(' + ')}
 function tickets(){
  const ids=g.turn?[]:availableGuests(),key=ids.map(i=>[i,orderName(i)]).join('/')
  const parent=el('customers')
  if(key!==ticketKey){ticketKey=key;parent.replaceChildren();for(const i of ids){
   const o=cfg.orders[i],v=g.guests[i],x=serveX[o.spot],fn=()=>{if(offered){act({action:'serve',...offered,guest:i});return}toggleBook(true);guide.follow(g,i);if(g.source==='cup'?g.canServe(i,'cup',g.selected,false):g.canServe(i,'food',g.foodIndex,false))act({action:'guest',guest:i})}
   const guest=button('',fn,'Serve '+o.name);guest.className='guest';Object.assign(guest.style,{left:(x-75)/stage.w*100+'%',top:'25%',width:'9%',height:'32%'});attach(guest,undefined,'guest/'+i)
   const ticket=button('',()=>{if(offered){fn();return}toggleBook(true);guide.follow(g,i);if(!o.drink||g.guests[i].gotDrink)fn()},o.name+' · '+orderName(i));ticket.className='ticket';ticket.style.left=x/stage.w*100+'%';ticket.style.bottom='76%';attach(ticket,undefined,'guest/'+i)
   ticket.append(tag('span',String(orderNumber(i)),'order-number'));ticket.append(tag('small',o.mode==='To go'?ounces(o.size)+' · To go':'Dine in'))
   const icons=tag('span','','ticket-icons');ticket.append(icons)
   if(o.drink&&!v.gotDrink){const r=cfg.recipes[o.drink];const cup=o.mode==='To go'?r.travelCup:r.cup,im=new Image();im.src=cup==='mug'?'/counter/mug-empty.webp':activeCupPath(activeCupId(cup,o.size));im.alt=cfg.cups[cup];icons.append(im);ticket.append(tag('small',cfg.cups[cup],'ticket-vessel'))}
   if(o.food&&!v.gotFood){const im=new Image();im.alt='';im.src=['madeleine','cookie','chips','brownie'].includes(o.food)?'/empire_snacks/empire_'+o.food+'.webp':'/counter/'+(o.food==='pesto'?'grilled-pesto':o.food)+'.webp';icons.append(im)}
   ticket.append(tag('strong',orderName(i)),tag('i'));ticket.dataset.guest=String(i);parent.append(guest,ticket)
  }}
  for(const n of parent.querySelectorAll<HTMLElement>('.ticket')){const i=Number(n.dataset.guest),f=g.guests[i].left/g.ticks(cfg.orders[i].patience),bar=n.lastElementChild as HTMLElement;const heldItem=drag?.active?drag.carry:offered;const eligible=!!heldItem&&(heldItem.kind==='food'||heldItem.kind==='cup')&&g.canServe(i,heldItem.kind,heldItem.slot,true);n.classList.toggle('eligible',eligible);bar.style.transform='scaleX('+f+')';bar.style.background=f<.2?'#bd5533':f<.5?'#bb893c':'#6d874d'}
 }
 const checks=el('pass-checks')
 let checkSignature=''
 function updateChecks(){
  if(!g.kitchen||g.turn){checks.hidden=true;return}
  const foodOrders=g.guests.flatMap((guest,i)=>{
   const order=cfg.orders[i]
   return guest.state==='waiting'&&order.food&&!guest.gotFood?[{order,guest,i}]:[]
  }).sort((a,b)=>a.guest.left-b.guest.left).slice(0,2)
  const unread=(['Door','Window'] as const).filter(end=>g.guests.some((guest,i)=>guest.state==='ready'&&cfg.orders[i].end===end))
  const key=JSON.stringify([level,foodOrders.map(v=>v.i),unread])
  checks.hidden=!foodOrders.length&&!unread.length
  if(checkSignature===key)return
  checkSignature=key;checks.replaceChildren()
  for(const {order} of foodOrders){
   const food=order.food!,label=cfg.foods[food].name
   const n=button('',()=>act({action:'to',view:order.end}),'Go to '+order.name+' at '+order.end)
   const im=new Image();im.alt='';im.src=['madeleine','cookie','chips','brownie'].includes(food)?'/empire_snacks/empire_'+food+'.webp':'/counter/'+(food==='pesto'?'grilled-pesto':food)+'.webp'
   n.append(tag('small',order.end+' · '+order.name),im,tag('strong',label),tag('small',order.mode));checks.append(n)
  }
  if(!foodOrders.length)for(const end of unread)checks.append(button(end+' · Take order',()=>act({action:'to',view:end})))
 }
 let previousView=g.view
 function sync(){
  const payment=g.lastPayment,receipt=el('counter-payment')
  const order=payment?cfg.orders[payment.guest]:undefined
  const visible=payment&&order&&g.view===order.end&&!g.turn&&g.tick-payment.at<g.ticks(cfg.stations.departure)
  receipt.hidden=!visible
  if(visible){
   const copy='+'+(payment.price+payment.tip+payment.bonus)+' coins'+(payment.tip?' · '+payment.tip+' tip':'')
   if(receipt.textContent!==copy)receipt.textContent=copy
   receipt.style.left=serveX[order.spot]/stage.w*100+'%'
  }
  updateChecks();el('app').dataset.view=g.kitchen?'rear':'front'
  if(previousView!==g.view){previousView=g.view;choose(g.kitchen?'Kitchen':'Espresso')}
  for(const opt of area.options)opt.hidden=g.kitchen?!['Kitchen','Food'].includes(opt.value):opt.value==='Kitchen'
  if(g.kitchen&&!['Kitchen','Food'].includes(panel))choose('Kitchen')
  if(el('shift-name').textContent!==shiftName(level))el('shift-name').textContent=shiftName(level)
  el('level').textContent=shiftName(level);el('coins').textContent=g.coins+' coins';el('count').textContent=g.served+' / '+g.guests.length+' served'
  for(const id of ['Door','Window','Kitchen'] as const){const b=el(id.toLowerCase());b.setAttribute('aria-current',String(g.view===id));const waiting=activeOrderIds(g).filter(i=>cfg.orders[i].end===id).length;b.classList.toggle('waiting',waiting>0&&g.view!==id);b.textContent=id;if(id==='Window'&&waiting){b.append(tag('span',String(waiting),'window-count'));b.setAttribute('aria-label',`Window · ${waiting} active orders`)}else b.setAttribute('aria-label',id)}
  el('area-switch').style.setProperty('--area',String(['Door','Window','Kitchen'].indexOf(g.view)))
  const kitchenNav=el('kitchen')
  kitchenNav.title=g.kitchen?'Kitchen':'Turn to the kitchen'
  if(g.tick>=hintUntil){const d=g.groups[head];el('feedback').textContent=g.turn?'Turning…':g.kitchen?(!g.started?'Load a panino from the bin. Tap its plate to grill.':g.pressSlots.some(s=>s.state==='loaded')?'Tap a loaded plate to close its press.':g.guests.some(v=>v.state==='ready')?'Guests are at the counter. Visit Door or Window to see their orders.':'Tap a supply bin to load. Drag ready food onto the pass.'):g.basket!=='mounted'?'Group '+(g.serviceHead+1)+' · '+phaseName():d.pots.some(Boolean)?'Stage a cup. Tap a filled pitcher, then the cup, or drag to pour.':g.cups.some(c=>g.recipe(c))?'Serve a matching guest at the counter.':!g.started?'Tap a supply bin to load. Swipe the counter to change views.':'Assemble any drink. Select the guest when ready.'}
  music.score.set(!sound||document.hidden?'silent':paused||endShown?'menu':g.started?'service':'prep')
  music.state(sound&&g.started&&!paused&&(!g.done||!!g.delivery||!endShown));music.machines(g)
  hotspots()
  for(const label of el('targets').querySelectorAll<HTMLElement>('[data-clock]')){
   const [station,index]=label.dataset.clock!.split('/')
   const job=(station==='oven'?g.ovenSlots:g.pressSlots)[Number(index)]?.cook
   if(job)label.textContent=Math.ceil((job.end-g.tick)*cfg.tickMs/1000)+'s'
  }
  tickets();renderControls();refreshPeek();if(bookOpen)guide.update(g);el('shift-coins').textContent=g.coins+' coins'
  if(g.done&&!g.delivery&&!endShown){endShown=true;completeLevel(progress,level,g.stars,g.coins);saveProgress(progress);show('result')}
 }
 function close(){dialog.close();paused=false;clock.reset();last=0;sync()}
 function reset(next:number){if(next>progress.unlocked)return;clearPick();checkSignature='';travel.clear();endDrag();offered=null;placingPesto=false;level=next;cfg=levelConfig(base,level,progress.ranks);g=new Bench(cfg,tuning);hidePeek();head=0;endShown=false;signature=hotKey='';ticketKey='reset';hintUntil=0;previousView=g.view;uiTick=-1;choose(g.kitchen?'Kitchen':'Espresso');close();draw(g,0,head)}
 function changeShift(next:number){if(g.started&&!g.done){show('switch',next);return}reset(next)}
 function startTuning(){
  if(g.done)return
  cancelViewportGestures();clearPick();dialog.close();paused=true;tuningLayers=true
  el('app').inert=true;el('world').classList.add('layer-preview');music.state(false);tuner.show();draw(g,0,head)
 }
 function stopTuning(){
  tuningLayers=false;tuner.hide();el('app').inert=false;el('world').classList.remove('layer-preview');paused=false;clock.reset();last=0;sync();draw(g,0,head)
 }
 function show(page:string,next=level){
  clearPick();hidePeek();endDrag();paused=true;music.score.set(sound&&!document.hidden?'menu':'silent');music.unlock();music.state(false);const s=el('sheet');s.replaceChildren()
  const titles:Record<string,string>={menu:'Via Bianca',book:'Recipe book',shifts:'Shifts & equipment',result:shiftName(level),inspect:'Counter inspector',switch:'Leave this shift?',immersive:'Play in full screen'}
  s.append(tag('h2',titles[page]))
  if(page==='menu'){
   const toggle=button('Workstation buttons · '+(assist?'On':'Off'),()=>{
    assist=!assist;try{localStorage.setItem('via-bianca-controls',assist?'on':'off')}catch{}
    signature='';layout();renderControls();show('menu')
   })
   toggle.setAttribute('aria-pressed',String(assist))
   s.append(tag('p','Drag a pitcher or ingredient onto a cup, or tap the source and then the cup. Tap a completed drink to serve a matching guest. Open Recipes to keep an order beside the counter.'),toggle,button('Recipes',()=>{close();toggleBook(true)}),button('Shifts & equipment',()=>show('shifts')),button('Inspector',()=>show('inspect')),button('Developer · Layer tuner',startTuning),button(sound?'Sound on':'Sound off',()=>{sound=!sound;show('menu')}))
  }
  if(page==='immersive')s.append(tag('p','This browser did not enter full screen. On iPhone, open this page in Safari, use Share (or More → Share), choose Add to Home Screen, and enable Open as Web App if offered. Open Via Bianca from its new icon and rotate to landscape. This may hide Safari’s toolbars; system safe areas still apply.'))
  if(page==='inspect'){s.append(tag('pre',[cfg.seed+' seed · '+g.tick+' tick · '+g.view,...g.groups.map((v,h)=>'G'+(h+1)+' · '+v.pulls+' doses · A '+(v.pots[0]??'empty')+' / B '+(v.pots[1]??'empty')+' · '+(v.extraction?'pulling '+labelLane(v.extraction.lane):'idle')),'Oven · '+g.ovenSlots.map(s=>s.state).join(' / '),'Press · '+g.pressSlots.map(s=>s.state+(s.pesto?' pesto':'')).join(' / '),'Maintenance G'+(g.serviceHead+1)+' · '+g.basket,'Ice '+g.ice+' · beans '+g.beans+' · tank '+g.milkTank+' · silky '+g.milk+' · airy '+g.textures.airy+' · fridge '+g.milkReserve,'Coins '+g.coins+' · bank '+progress.bank+' · smiles '+g.smiles+' · waste '+g.waste+' · bin '+g.binLoad+'/'+cfg.capacity.bin,...g.guests.map((v,i)=>cfg.orders[i].name+' · '+cfg.orders[i].archetype+' · '+v.state+' · '+Math.ceil(v.left*cfg.tickMs/1000)+'s'),...g.events.slice(-4)].join('\n')))}
  if(page==='result'){
   const stars=tag('h3','★'.repeat(g.stars)+'☆'.repeat(3-g.stars),'receipt-stars')
   stars.setAttribute('aria-label',g.stars+' out of 3 stars')
   const summary=tag('p',g.served+' served · '+g.expired+' left · '+g.smiles+' smiles')
   const ledger=tag('dl','','shift-ledger')
   for(const [name,value] of [['Food & drinks',g.sales],['Service tips',g.tips],['Quick-service bonuses',g.bonuses],['Banked this shift',g.coins]] as const){
    ledger.append(tag('dt',name),tag('dd',String(value)))
   }
   s.append(stars,summary,ledger,button('Shifts & equipment',()=>show('shifts')),button('Replay',()=>reset(level)))
  }
  if(page==='switch'){s.append(tag('p','This shift is still in progress. Starting another shift gives up its current earnings.'),button('Start '+shiftName(next),()=>reset(next)))}
  if(page==='shifts'){
   s.append(button(piazzaName,()=>changeShift(piazzaShift)),button(lunchName,()=>changeShift(lunchShift)),button(breakfastName,()=>changeShift(0)))
   s.append(tag('p',progress.bank+' coins available. Earn a star to open the next shift.'))
   levels.forEach((l,i)=>{const row=tag('div','','entry'),copy=tag('div');copy.append(tag('b',l.name),tag('small',l.tickets+' guests · '+(progress.stars[i]?'★'.repeat(progress.stars[i]):l.subtitle)));const b=button(progress.unlocked>i?'Play':'Locked',()=>changeShift(i+1));b.disabled=progress.unlocked<=i;row.append(copy,b);s.append(row)})
   s.append(tag('h3','Equipment'));for(const u of upgrades){const rank=progress.ranks[u.id],cost=u.costs[rank],row=tag('div','','entry'),copy=tag('div');copy.append(tag('b',u.name),tag('small',u.description+' · From next shift'));const b=button(cost===undefined?'Max':cost+' coins',()=>{if(buyUpgrade(progress,u.id))saveProgress(progress);show('shifts')});b.disabled=cost===undefined||progress.bank<cost;row.append(copy,b);s.append(row)}
  }
  if(page!=='result')s.append(button(g.done?'Results':'Resume',()=>g.done?show('result'):close()));if(!dialog.open)dialog.showModal()
 }

 // The engraved strip is also a short-travel thumb selector on touch screens.
 const strip=el('area-switch')
 let navDrag:{id:number;x:number;moved:boolean}|null=null,navSuppress=0
 strip.addEventListener('pointerdown',e=>{if(e.isPrimary&&cancelledNavPointer!==null){cancelledNavPointer=null;navSuppress=0}if(!navDrag&&!drag&&e.isPrimary&&e.button===0&&!paused&&!g.turn)navDrag={id:e.pointerId,x:e.clientX,moved:false}})
 strip.addEventListener('pointermove',e=>{
  if(navDrag?.id!==e.pointerId)return
  if(!navDrag.moved&&Math.abs(e.clientX-navDrag.x)<6)return
  navDrag.moved=true;strip.setPointerCapture(e.pointerId)
  const r=strip.getBoundingClientRect()
  strip.style.setProperty('--preview',String(Math.max(0,Math.min(2,(e.clientX-r.left)*3/r.width-.5))))
 })
 strip.addEventListener('pointerup',e=>{
  if(navDrag?.id!==e.pointerId)return
  if(navDrag.moved){
   navSuppress=performance.now()+300
   const r=strip.getBoundingClientRect(),i=Math.max(0,Math.min(2,Math.floor((e.clientX-r.left)*3/r.width)))
   act({action:'to',view:(['Door','Window','Kitchen'] as const)[i]})
  }
  navDrag=null;strip.style.removeProperty('--preview')
 })
 function cancelNav(){navDrag=null;strip.style.removeProperty('--preview')}
 strip.addEventListener('pointercancel',e=>{cancelOwnedPointer(navDrag,e.pointerId,cancelNav)})
 strip.addEventListener('lostpointercapture',e=>{cancelOwnedPointer(navDrag,e.pointerId,cancelNav)})
 strip.addEventListener('pointerleave',e=>{if(!navDrag?.moved)cancelOwnedPointer(navDrag,e.pointerId,cancelNav)})
 strip.addEventListener('click',e=>{if(cancelledNavPointer!==null||performance.now()<navSuppress){e.preventDefault();e.stopImmediatePropagation()}},true)
 for(const v of ['Door','Window','Kitchen'] as const)el(v.toLowerCase()).onclick=()=>act({action:'to',view:v})
 bindImmersive(el<HTMLButtonElement>('fullscreen'),()=>show('immersive'),()=>say('Could not exit full screen. Use your browser’s exit control.'))
 el('recipes').onclick=()=>toggleBook(!bookOpen);el('close-book').onclick=()=>toggleBook(false);el('shifts').onclick=()=>show('shifts');el('menu').onclick=()=>show('menu');dialog.oncancel=e=>{e.preventDefault();if(!g.done)close()}
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&g.started)show('menu');if(document.hidden)music.score.set('silent');else sync()})
 let lastPaint=0
 function frame(now:number){
  if(!paused){
   clock.advance(last?Math.min(1500,now-last):0,cfg.tickMs,()=>g.step())
   if(g.tick!==uiTick){uiTick=g.tick;sync()}
   if(now-lastPaint>=1000/30){draw(g,clock.fraction(cfg.tickMs),head);lastPaint=now}
  }
  last=now;requestAnimationFrame(frame)
 }
 layout();sizeCanvas();choose(g.kitchen?'Kitchen':'Espresso');sync();draw(g,0,head);requestAnimationFrame(frame)
}
open().catch(e=>{el('feedback').textContent='Unable to open the workstation: '+e.message})
