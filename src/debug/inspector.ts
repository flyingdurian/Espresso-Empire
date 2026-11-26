import type {Content} from '../content/model.ts'
import {zone,type Snapshot} from '../sim/simulation.ts'
export function renderInspector(host:HTMLElement,data:Content,s:Snapshot,tab:string) {
  const nodes:HTMLElement[]=[]
  function element(tag:string,cls:string,text='') {const n=document.createElement(tag);n.className=cls;n.textContent=text;return n}
  function record(name:string,place:string,phase:string,caption:string,timing:string,ratio:number) {
    const row=element('div','record'),head=element('div','recordtop'),title=element('strong','',name),
      status=element('span','flag '+phase,phase),info=element('div','tinyrow'),bar=element('div','bar '+phase),fill=element('i','')
    title.append(element('span','',' · '+place));head.append(title,status);info.append(element('span','',caption),element('b','',timing))
    fill.style.width=Math.min(100,ratio*100)+'%';bar.append(fill);row.append(head,info,bar);nodes.push(row)
  }
  const sec=(ticks:number)=>(ticks*data.tuning.tickMs/1000).toFixed(1)
  if(tab==='orders') for(const o of s.orders){
    const place=data.building.sections.find(f=>f.id===o.section)!.name
    const recipe=data.menu.recipes.find(r=>r.id===o.item)!
    record(o.seat,place,o.remaining?zone(o,data.tuning.zoneBoundaries):'Elapsed',recipe.name,sec(o.remaining)+' / '+sec(o.max)+' s',o.remaining/o.max)
  }
  if(tab==='stations') for(const m of s.stations){
    const def=data.menu.stations.find(d=>d.id===m.id)!
    record(def.name,def.section,m.phase,'Batch of '+def.batch,sec(m.remaining)+' s',m.remaining*data.tuning.tickMs/1000/(m.phase==='hold'?def.graceSeconds:def.cycleSeconds))
  }
  if(tab==='cart') {
    const used=s.cart.filter(Boolean).length
    nodes.push(element('div','record',used+' of '+s.cart.length+' slots occupied'))
    for(const [title,slots] of [['Cups',s.cart.slice(0,data.diagnostic.cupSlots)],['Plates',s.cart.slice(data.diagnostic.cupSlots)]] as const){
      nodes.push(element('div','small',title));const grid=element('div','slots')
      for(const id of slots) grid.append(element('span',id?'slot filled':'slot',id?data.menu.recipes.find(r=>r.id===id)!.name:'Empty'))
      nodes.push(grid)
    }
  }
  host.replaceChildren(...nodes)
}
