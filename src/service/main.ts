import './game.css'
import {FixedClock} from '../sim/clock.ts'
import {Shift,resources,type Action,type Input,type Item,type Resource,type ShiftData} from './shift.ts'
import {seatX,garnishes,cradleX,wellX,createPaintedStage} from './stage.ts'
import type {Tuning} from '../content/model.ts'

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T
function node<K extends keyof HTMLElementTagNameMap>(tag:K,cls='',text=''){
  const n=document.createElement(tag);n.className=cls;n.textContent=text;return n
}
const img=(id:string)=>{const n=new Image();n.src='/art/'+id+'.webp';n.alt='';return n}
const action=(text:string,fn:()=>void,cls='')=>{const b=node('button',cls,text);b.onclick=fn;return b}
const json=async<T>(name:string):Promise<T>=>{const r=await fetch('/data/'+name+'.json');if(!r.ok)throw Error('Missing '+name);return r.json()}
async function start(){
  const [data,tuning,paint]=await Promise.all([json<ShiftData>('lounge-shift'),json<Tuning>('tuning'),createPaintedStage(el('painting'))])
  let game=new Shift(data,tuning),paused=false,endShown=false,feedback='',feedbackUntil=0,sound=true
  let drawerOpen=false
  let audio:AudioContext|null=null
  function chime(freq:number,end:number,length:number){
    if(!sound)return
    try{audio??=new AudioContext();if(audio.state==='suspended')void audio.resume().catch(()=>{})
      const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime
      o.type='sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+length);g.gain.setValueAtTime(.0001,t)
      g.gain.exponentialRampToValueAtTime(.045,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+length)
      o.connect(g);g.connect(audio.destination);o.start();o.stop(t+length+.02)
    }catch{/* Muted or unsupported audio leaves touch play available. */}
  }
  const guests=data.seats.map((seat,i)=>{
    const actor=node('button','actor'),order=node('button','order'),icons=node('span','icons'),meter=node('span','meter'),bar=node('i')
    meter.append(bar);order.append(icons,meter);el('guests').append(actor,order)
    actor.style.left=order.style.left=seatX[i]/16+'%';actor.onclick=order.onclick=()=>input({action:'guest',seat:i})
    return {actor,order,icons,bar,key:''}
  })
  const tools=new Map<string,HTMLButtonElement>()
  function hotspot(key:string,x:number,y:number,w:number,h:number,fn:()=>void){
    const b=node('button','hot'),tag=node('span','tag');b.append(tag);b.dataset.act=key
    Object.assign(b.style,{left:x/16+'%',top:y/9+'%',width:w/16+'%',height:h/9+'%'})
    b.onclick=fn;tools.set(key,b);el('tools').append(b)
  }
  const faucet=action('',()=>input({action:'prepare',tool:'standard'}),'faucet')
  faucet.setAttribute('aria-label','Pull standard shot at spout');el('tools').append(faucet)
  for(const [i,key] of (['short','standard'] as const).entries()){
    hotspot(key,145+i*153,752,147,90,()=>input({action:'prepare',tool:key}))
  }
  hotspot('cradle',cradleX,688,211,156,()=>input({action:'cradle'}))
  for(let i=0;i<data.wells;i++)hotspot('well'+i,wellX(i),713,196,147,()=>input({action:'well',index:i}))
  for(const g of garnishes)hotspot(g.tool,g.x,567,166,145,()=>{
    if(g.tool==='snacks'){drawerOpen=!drawerOpen;render()}
    else input({action:'prepare',tool:g.tool})
  })
  for(const k of ['bread','warm','cookie'] as const){
    const a=data.actions[k],b=action('',()=>{drawerOpen=false;input({action:'prepare',tool:k})})
    b.append(img(a.result),node('span'));b.dataset.snack=k;el('snackdrawer').append(b)
  }
  const machineKeys=resources.filter(k=>data.supplies[k].cycle>0)
  const machineButtons=machineKeys.map((k,i)=>{
    const b=node('button','machine'),txt=node('span');b.style.left=(5+i*30)+'%';b.append(txt)
    b.onclick=()=>input({action:'station',resource:k});el('machines').append(b);return b
  })
  const supplyArt:Record<Resource,string>={dose:'doses',milk:'milk',warm:'warm',water:'water-urn',cold:'cold-jug',bread:'bread-basket',cookie:'cookie-caddy'}
  const inventory=resources.map(k=>{
    const pantry=!data.supplies[k].cycle,n=node(pantry?'button':'span','rackitem')
    if(pantry)n.onclick=()=>input({action:'station',resource:k})
    n.append(img(supplyArt[k]),node('b'));el('loadout').append(n);return n
  })
  const target=Math.ceil(data.orders.length*tuning.starFractions[tuning.starFractions.length-1])
  const panel=el<HTMLDialogElement>('panel'),content=el('panelContent'),board=el('board'),clock=new FixedClock()
  const secs=(ticks:number)=>(ticks*tuning.tickMs/1000).toFixed(1)
  function guidance(){
    if(game.transit)return 'The cart is travelling with you.'
    if(game.room==='Back Bar')return 'Start batches above. Tap Load when ready. Pantry supplies restock below.'
    if(game.ended)return 'Shift complete.'
    if(game.source!=='active'&&game.held)return data.recipes[game.held].label+' selected · tap a matching guest.'
    if(game.work)return data.actions[game.operation!].label+'…'
    if(drawerOpen)return 'Plate a snack, then tap its guest.'
    if(game.active==='espresso')return 'Serve espresso, add water, milk or chilled base, or tap the tin to park.'
    if(game.active==='latte')return 'Serve the latte, add foam for cappuccino, or tap the cup to park.'
    if(game.active)return data.recipes[game.active].label+' ready · tap a matching guest or tap the item to park.'
    if(!game.stock.dose)return 'Out of coffee doses. Ride to the Back Bar to grind more.'
    return game.started?'Choose a pull or snack. Tap a guest when your item is ready.':'Try a standard pull. The first guests order as you work.'
  }
  function render(fraction=0){
    const inBar=game.room==='Back Bar',remaining=data.orders.length-game.served-game.expired
    el('where').textContent=game.room;el('people').textContent=remaining+(remaining===1?' guest':' guests');el('cash').textContent=game.coins+(game.coins===1?' coin':' coins')
    el('smiles').textContent=game.smiles+'/'+target+' smiles · ★★★';el('floorcode').textContent=inBar?'B1':'F1'
    el('guests').hidden=el('tools').hidden=inBar;el('machines').hidden=el('loadout').hidden=!inBar;el('ride').hidden=!game.transit
    el('lift').textContent=inBar?'Lift · Lounge'+(game.seats.some(s=>s.state==='waiting')?' !':''):'Lift · Back Bar'
    el('hint').textContent=game.tick<feedbackUntil?feedback:guidance()
    el('clear').hidden=inBar||!game.held
    el('snackdrawer').hidden=inBar||!drawerOpen||!!game.transit
    const phase=game.work?Math.min(1,1-(game.work-fraction)/game.workTotal):0
    el('stream').hidden=inBar||!(game.operation==='standard'||game.operation==='short')
    paint(game,phase)
    guests.forEach((g,i)=>{
      const s=game.seats[i],waiting=s.state==='waiting',items=data.orders[s.order].items
      g.actor.disabled=!waiting;g.actor.hidden=!waiting;g.order.hidden=!waiting
      g.order.className='order'+(s.left/s.max<tuning.zoneBoundaries[0]?' risk':s.left/s.max<tuning.zoneBoundaries[1]?' warn':'')
      g.bar.style.transform='scaleX('+s.left/s.max+')'
      const key=s.order+'-'+s.delivered.join('-')
      if(g.key!==key){
        g.key=key;const delivered=s.delivered.slice()
        g.icons.replaceChildren(...items.map(item=>{
          const badge=node('span','orderitem'),ix=delivered.indexOf(item)
          if(ix>=0){badge.classList.add('done');delivered.splice(ix,1)}
          badge.append(img(item),node('small','',data.recipes[item].label));return badge
        }))
        const description=data.seats[i].name+' · '+game.remaining(s).map(it=>data.recipes[it].label).join(' + ')
        g.order.setAttribute('aria-label',description);g.actor.setAttribute('aria-label','Serve '+description)
      }
    })
    const labels:Record<string,string>={short:'Short pull',standard:'Standard pull',snacks:'Snacks',cradle:game.work?data.actions[game.operation!].label+'…':game.active?data.recipes[game.active].label:'Cradle'}
    for(const g of garnishes){
      if(g.tool==='snacks')continue
      const a=data.actions[g.tool];labels[g.tool]=a.label+(a.supply?' · '+game.stock[a.supply]:'')
    }
    for(let i=0;i<data.wells;i++)labels['well'+i]=game.parked[i]?data.recipes[game.parked[i]!].label:'Well '+(i+1)
    for(const [k,b] of tools){
      b.firstElementChild!.textContent=labels[k]
      const selected=k==='cradle'?game.source==='active'&&!!game.active:k==='well'+game.source
      b.classList.toggle('next',selected)
      if(k==='short'||k==='standard')b.dataset.stock=game.stock.dose+(game.stock.dose===1?' dose':' doses')
      b.setAttribute('aria-label',k.startsWith('well')?'Holding well '+(Number(k.slice(4))+1)+' · '+labels[k]:labels[k])
    }
    for(const b of el('snackdrawer').querySelectorAll<HTMLButtonElement>('button')){
      const a=data.actions[b.dataset.snack as Action];b.lastElementChild!.textContent=a.label+' · '+game.stock[a.supply!]
    }
    machineKeys.forEach((k,i)=>{
      const m=game.stations[k],b=machineButtons[i];b.className='machine '+m.phase
      b.firstElementChild!.textContent=data.supplies[k].station+' · '+(m.phase==='idle'?'Start':m.phase==='working'?secs(m.left)+' s':'Load ×'+m.count)
    })
    resources.forEach((k,i)=>{
      const def=data.supplies[k];inventory[i].lastElementChild!.textContent=def.label+' '+game.stock[k]+'/'+def.capacity
    })
    if(game.ended&&!endShown){endShown=true;show('result')}
  }
  function fly(item:Item,i:number,startX:number){
    if(matchMedia('(prefers-reduced-motion:reduce)').matches)return
    const f=img(item);f.className='flight';f.style.left=startX+'%';f.style.top='81%'
    board.append(f);const a=f.animate([{left:startX+'%',top:'81%',opacity:1},{left:(seatX[i]/16+startX)/2+'%',top:'51%',opacity:1},{left:seatX[i]/16+'%',top:'46%',opacity:0}],{duration:440,easing:'ease-out'})
    a.onfinish=()=>f.remove()
  }
  function input(c:Input){
    if(paused||game.ended)return
    const prev=game.coins,held=game.held,eventCount=game.events.length,origin=game.source==='active'?cradleX:wellX(game.source)
    const message=game.command(c)
    feedback=message;feedbackUntil=game.tick+game.ticks(1.3)
    if(c.action==='travel')drawerOpen=false
    if(c.action==='prepare'&&game.events.length>eventCount)feedbackUntil=game.tick+game.work
    if(held&&c.action==='guest'&&game.events.length>eventCount)fly(held,c.seat,origin/16)
    if(game.coins>prev&&c.action==='guest'){
      const pop=el('popup');pop.textContent='+'+(game.coins-prev)+(game.combo>1?' · ×'+game.combo:'')
      pop.style.left=seatX[c.seat]/16+'%';pop.style.top='32%';pop.classList.remove('pop');void pop.offsetWidth;pop.classList.add('pop')
      chime(518,800,.19);feedbackUntil=0
    }else if(game.events.length!==eventCount)chime(230,390,.09)

    render()
  }
  function restoreBoard(){
    if(board.parentElement!==el('app')){el('app').insertBefore(board,document.querySelector('footer'));board.inert=false}
  }
  function close(){restoreBoard();panel.close();paused=false;clock.reset();last=null;render()}
  const restart=()=>{restoreBoard();game=new Shift(data,tuning);endShown=false;drawerOpen=false;feedbackUntil=0;guests.forEach(g=>g.key='');el('popup').textContent='';close()}
  function styleKit(){
    const sheet=node('section','sheet'),swatches=node('div','swatches'),icons=node('div','kiticons')
    for(const [name,color] of [['Walnut','#73432b'],['Olive enamel','#666638'],['Brass','#c69c57'],['Cream paper','#fff0d3']]){
      const chip=node('span','',name),dot=node('i');dot.style.background=color;chip.prepend(dot);swatches.append(chip)
    }
    for(const id of Object.keys(data.recipes) as Item[]){const f=node('figure');f.append(img(id),node('figcaption','',data.recipes[id].label));icons.append(f)}
    sheet.append(node('h3','','Palette & order icons'),swatches,icons,node('p','','Icons shown at 48 px. Soft painted edges and shadows unify the figures and props. The portrait, order card and active cup occupy separate bands.'))
    return sheet
  }
  function show(page:string){
    restoreBoard();paused=true;panel.classList.toggle('wide',page==='art');content.replaceChildren()
    const heading=node('h2','',page==='art'?'Painted reference & live frame':page==='debug'?'Shift inspector':page==='result'?'Service complete':page==='recipes'?'Coffee menu':'Via Bianca')
    content.append(heading)
    if(page==='art'){
      const pair=node('div','compare'),left=node('figure'),right=node('figure')
      left.append(node('figcaption','','Approved Lounge painting'),img('reference'));right.append(node('figcaption','','Current playable frame'),board)
      board.inert=true;pair.append(left,right);content.append(pair,node('p','','Warm left-hand light, walnut and olive enamel, cream order cards and brass hardware carry through to the working cart.'),styleKit())
    }else if(page==='debug'){
      const s=game.seats.map((v,i)=>data.seats[i].name+' · '+v.state+' · '+secs(v.left)+' s · '+game.remaining(v).join(' + ')).join('\n')
      const machines=machineKeys.map(k=>data.supplies[k].station+' · '+game.stations[k].phase+' · '+secs(game.stations[k].left)+' s').join('\n')
      content.append(node('pre','', 'Seed '+data.seed+' · RNG '+game.rng+' · tick '+game.tick+'\n'+game.room+' · transit '+secs(game.transit)+' s\n\n'+s+'\n\n'+machines+'\n\nCart: '+resources.map(k=>k+' '+game.stock[k]).join(' / ')+'\nCradle '+(game.active??'empty')+' · operation '+(game.operation??'idle')+' · wells '+game.parked.map(v=>v??'empty').join(' / ')+' · selected '+game.source+'\nServed '+game.served+' · expired '+game.expired+' · trash '+game.trash+' · lift rides '+game.rides+'\nMean patience at serve '+(game.served?Math.round(100*game.patienceSum/game.served)+'%':'—')+' · mean cart fullness '+(game.tick?Math.round(100*game.occupancySum/game.tick)+'%':'—')+'\nFloor time: Bar '+secs(game.floorTicks['Back Bar'])+' s / Lounge '+secs(game.floorTicks.Lounge)+' s\n\n'+game.events.slice(-4).map(e=>'T'+e.tick+' '+e.name).join('\n')))
      content.append(action('Step +1',()=>{game.started=true;game.step();render();if(!game.ended)show('debug')}))
    }else if(page==='result'){
      const grid=node('div','statgrid');for(const [label,val] of [['Served',game.served],['Expired',game.expired],['Smiles',game.smiles],['Coins',game.coins]]){const n=node('span');n.append(node('b','',String(val)),String(label));grid.append(n)}
      content.append(node('div','stars','★'.repeat(game.stars)+'☆'.repeat(tuning.starFractions.length-game.stars)),grid,node('p','','Three stars require '+target+' smiles. Complete an order while the patience bar is green to earn one.'),action('Play again',restart))
    }else if(page==='recipes'){
      const list=node('div','recipe-list')
      for(const [id,r] of Object.entries(data.recipes)){
        if(!['short','standard'].includes(r.steps[0]))continue
        const row=node('div'),copy=node('span');copy.append(node('b','',r.label),node('small','',r.steps.map(k=>data.actions[k].label).join(' → ')))
        row.append(img(id),copy);list.append(row)
      }
      content.append(list,node('p','','Tap the finished item to park it. Tap its well to select it for delivery.'),action('Resume service',close))
    }else{
      content.append(node('p','','Pull a shot whenever you like. Finish it at the cart, then tap a guest to serve. Tap a finished item to park it in a well. Refill at the Back Bar.'),action('Coffee menu',()=>show('recipes')),
        action('Resume service',close),action('Sound · '+(sound?'on':'off'),()=>{sound=!sound;show('menu')},'secondary'),action('Start over',restart,'secondary'))
    }
    if(page!=='art')content.append(action('Art comparison',()=>show('art'),'secondary'))
    if(page!=='debug')content.append(action('Inspector',()=>show('debug'),'secondary'))
    if(page==='art'||page==='debug')content.append(action(game.ended?'Results':'Resume service',()=>game.ended?show('result'):close()))
    if(!panel.open)panel.showModal()
  }
  panel.addEventListener('cancel',e=>{e.preventDefault();if(game.ended)show('result');else close()})
  el('popup').addEventListener('animationend',()=>{el('popup').textContent='';el('popup').classList.remove('pop')})
  el('recipes').onclick=()=>show('recipes');el('menu').onclick=()=>show('menu');el('clear').onclick=()=>input({action:'discard'});el('lift').onclick=()=>input({action:'travel'})
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.started&&!paused&&!game.ended)show('menu')})
  let last:number|null=null
  function frame(now:number){
    if(!paused&&game.started&&!game.ended){
      const before=game.tick;clock.advance(last===null?0:now-last,tuning.tickMs,()=>game.step())
      if(before!==game.tick)render()
      else if(game.work){
        const duration=game.workTotal
        paint(game,Math.min(1,1-(game.work-clock.fraction(tuning.tickMs))/duration))
      }
    }
    last=now;requestAnimationFrame(frame)
  }
  el('loading').hidden=true;render();requestAnimationFrame(frame)
}
start().catch(e=>{el('loading').textContent='Unable to open the café. '+e.message})
