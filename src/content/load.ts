import Ajv from 'ajv'
import type {Content} from './model.ts'

export type ReadJson = (path:string)=>Promise<unknown>
const files = ['tuning','building','menu','diagnostic'] as const
export async function loadContent(read:ReadJson):Promise<Content> {
  const entries = await Promise.all(files.map(async name=>{
    const [data,schema] = await Promise.all([read(name+'.json'),read('schemas/'+name+'.json')])
    const validate = new Ajv({allErrors:true}).compile(schema as object)
    if (!validate(data)) throw Error(name+'.json '+validate.errors?.map(e=>e.instancePath+' '+e.message).join(', '))
    return [name,data]
  }))
  const content = Object.fromEntries(entries) as Content
  validateReferences(content)
  return content
}
export function validateReferences({tuning,building,menu,diagnostic:f}:Content) {
  function check(ok:boolean,path:string,message:string) { if (!ok) throw Error(path+' — '+message) }
  function unique(ids:string[],path:string) {
    check(new Set(ids).size===ids.length,path,'duplicate ID'); return new Set(ids)
  }
  const sections=unique(building.sections.map(s=>s.id),'building.json /sections')
  const seats=unique(building.sections.flatMap(s=>s.seats),'building.json /sections/seats')
  const stations=unique(menu.stations.map(s=>s.id),'menu.json /stations')
  const recipes=unique(menu.recipes.map(r=>r.id),'menu.json /recipes')
  const archetypes=unique(menu.archetypes.map(a=>a.id),'menu.json /archetypes')
  check(new Set(building.sections.filter(s=>s.kind==='production').map(s=>s.floorId)).size===1,'building.json /sections','expected exactly one full-production floor')
  for(const [i,e] of building.edges.entries()) check(sections.has(e.from)&&sections.has(e.to)&&e.from!==e.to,'building.json /edges/'+i,'invalid section reference')
  for(const [i,s] of menu.stations.entries()) check(sections.has(s.section)&&s.outputs.every(id=>menu.components.includes(id)),'menu.json /stations/'+i,'unknown section or component')
  for(const [i,r] of menu.recipes.entries()) check(menu.vessels.includes(r.vessel)&&r.components.every(id=>menu.components.includes(id)),'menu.json /recipes/'+i,'unknown vessel or component')
  for(const [i,a] of menu.archetypes.entries()) check(a.orderPool.every(id=>recipes.has(id)),'menu.json /archetypes/'+i+'/orderPool','unknown recipe')
  for(const [key,values] of Object.entries({staggerSeconds:tuning.staggerSeconds,neighborSeconds:tuning.neighborSeconds,zoneBoundaries:tuning.zoneBoundaries,starFractions:tuning.starFractions})) check(values.every((v,i)=>!i||v>=values[i-1]),'tuning.json /'+key,'values must be ascending')
  check(tuning.zoneBoundaries[0]<tuning.zoneBoundaries[1],'tuning.json /zoneBoundaries','thresholds must be distinct')
  check(sections.has(f.startSection),'diagnostic.json /startSection','unknown section')
  check(f.checkpointTick<=f.durationTicks,'diagnostic.json /checkpointTick','outside fixture duration')
  check(f.loadedCups.length<=f.cupSlots&&f.loadedCups.every(id=>recipes.has(id)),'diagnostic.json /loadedCups','capacity exceeded or unknown recipe')
  check(f.orderPool.length>0&&f.orderPool.every(id=>recipes.has(id)),'diagnostic.json /orderPool','expected known recipes')
  check(f.population===f.orders.length,'diagnostic.json /population','must match diagnostic order count')
  unique(f.orders.map(o=>o.id),'diagnostic.json /orders/id'); unique(f.orders.map(o=>o.seat),'diagnostic.json /orders/seat')
  for(const [i,o] of f.orders.entries()) {
    check(seats.has(o.seat)&&archetypes.has(o.archetype)&&(recipes.has(o.item)||o.item==='from-pool'),'diagnostic.json /orders/'+i,'unknown seat, archetype or item')
    check(o.remainingSeconds<=menu.archetypes.find(a=>a.id===o.archetype)!.patienceSeconds,'diagnostic.json /orders/'+i+'/remainingSeconds','exceeds patience')
  }
  for(const [i,c] of f.commands.entries()) check(c.tick<=f.durationTicks&&(c.kind==='cycle'?stations:sections).has(c.target),'diagnostic.json /commands/'+i,'invalid tick or target')
}
