import './style.css'
import {loadContent} from './content/load.ts'
import {Simulation,runTrace,digest} from './sim/simulation.ts'
import {FixedClock} from './sim/clock.ts'
import {createScene} from './view/scene.ts'
import {renderInspector} from './debug/inspector.ts'
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T
async function json(path:string) {
  const response=await fetch('./data/'+path)
  if(!response.ok) throw Error('Could not load '+path+' ('+response.status+')')
  return response.json()
}
async function start(){
  const data=await loadContent(json),f=data.diagnostic
  const seed=el<HTMLInputElement>('seed'),inspect=el<HTMLSelectElement>('inspect'),progress=el<HTMLProgressElement>('progress')
  seed.value=String(f.defaultSeed);progress.max=f.durationTicks
  inspect.add(new Option('Follow cart','follow'))
  for(const section of data.building.sections)inspect.add(new Option(section.name,section.id))
  const draw=await createScene(el('drawing'),data),clock=new FixedClock()
  let sim=new Simulation(data,f.defaultSeed),running=false,last:number|null=null,tab='orders',shownLog=-1
  function render(){
    const s=sim.snapshot(),finished=s.tick===f.durationTicks
    el('position').textContent=s.section+' · '+data.building.sections.find(v=>v.id===s.section)!.name
    el('active').textContent=s.orders.filter(o=>o.remaining>0).length+' active'
    el('tick').textContent=String(s.tick).padStart(3,'0')
    el('play').textContent=running?'Ⅱ  Pause':finished?'↻  Replay':'▶  Run fixture'
    el('status').textContent=running?'Running':finished?'Complete':'Paused'
    el('timecode').textContent=(s.tick*data.tuning.tickMs/1000).toFixed(1)+' / '+(f.durationTicks*data.tuning.tickMs/1000).toFixed(1)+' s'
    el<HTMLButtonElement>('step').disabled=running||finished;progress.value=s.tick
    draw(s,inspect.value==='follow'?s.section:inspect.value)
    renderInspector(el('details'),data,s,tab)
    if(shownLog!==s.events.length){
      shownLog=s.events.length;el('eventcount').textContent='('+shownLog+')'
      el('events').replaceChildren(...s.events.slice().reverse().map(e=>{
        const li=document.createElement('li');li.textContent='T'+String(e.tick).padStart(3,'0')+' · '+e.kind+' · '+e.detail;return li
      }))
    }
  }
  function reset(){
    if(!seed.reportValidity()||seed.value===''){seed.focus();return false}
    sim=new Simulation(data,Number(seed.value));running=false;last=null;shownLog=-1;clock.reset();render();return true
  }
  let frameId=0
  // Invalidate outstanding callbacks on pause/restart; each run owns one frame loop.
  function begin(){
    const token=++frameId
    function animate(now:number){
      if(!running||token!==frameId)return
      const before=sim.tick
      if(last!==null)clock.advance(now-last,data.tuning.tickMs,()=>sim.step())
      last=now
      if(sim.tick===f.durationTicks)running=false
      if(sim.tick!==before||!running)render()
      if(running)requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }
  el('reset').onclick=()=>{if(reset())frameId++}
  el('play').onclick=()=>{
    if(sim.tick===f.durationTicks&&!reset())return
    running=!running;last=null;frameId++;render();if(running)begin()
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&running){running=false;frameId++;last=null;render()}
  })
  el('step').onclick=()=>{if(!running){sim.step();render()}}
  inspect.onchange=render
  for(const btn of document.querySelectorAll<HTMLButtonElement>('.tab'))btn.onclick=()=>{
    tab=btn.dataset.tab!;document.querySelectorAll('.tab').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));render()
  }
  for(const id of ['elev','frame'])el(id).onclick=()=>{
    el('drawing').hidden=id==='frame';el('framing').hidden=id==='elev'
    for(const other of ['elev','frame'])el(other).setAttribute('aria-pressed',String(other===id))
  }
  for(const id of ['ratio43','ratio169'])el(id).onclick=()=>{
    el('framing').classList.toggle('wide',id==='ratio169')
    for(const other of ['ratio43','ratio169'])el(other).setAttribute('aria-pressed',String(id===other))
  }
  el('verify').onclick=async()=>{
    try {
      const ref=await json('checkpoint.json')
      const actual=digest(runTrace(data,ref.seed,ref.tick))
      el('verified').textContent=(actual===ref.digest?'Match':'Mismatch')+' · seed '+ref.seed+' · tick '+ref.tick+' · browser '+actual+' · headless '+ref.digest
    } catch(e){el('verified').textContent='Verification unavailable · '+String(e)}
  }
  render();el('loading').hidden=true;el('studio').hidden=false
}
start().catch(e=>{el('loading').textContent='Unable to open the fixture. '+e.message})
