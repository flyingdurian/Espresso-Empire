import assert from 'node:assert/strict'
import {access,readFile} from 'node:fs/promises'
import test from 'node:test'
import {workstation} from '../src/counter/scene.ts'
import {Bench,type Config} from '../src/counter/bench.ts'
import {stage} from '../src/counter/station-layout.ts'
import type {Tuning} from '../src/content/model.ts'
import {readData} from '../scripts/read.ts'

test('the packaged workstation draws extraction and both milk textures through a complete cappuccino',async()=>{
 const root=new URL('../public/',import.meta.url)
 class Sprite{
  width=60;height=60;src=''
  async decode(){await access(new URL(this.src.slice(1),root))}
 }
 const painted=new Set<string>()
 const gradient=()=>({addColorStop(){}})
 const operations={drawImage(img:Sprite){assert.ok(img?.src);painted.add(img.src)},createLinearGradient:gradient,createRadialGradient:gradient}
 const pen=new Proxy(operations,{get(target,key){return Reflect.get(target,key)??(()=>{})}})
 const canvas={width:1672,height:941,getContext:()=>pen} as unknown as HTMLCanvasElement
 const globals=globalThis as unknown as Record<string,unknown>
 const mock={Image:Sprite,window:{matchMedia:()=>({matches:false})},fetch:async(path:string)=>new Response(await readFile(new URL(path.slice(1),root),'utf8'))}
 const previous=Object.fromEntries(Object.keys(mock).map(key=>[key,globals[key]]))
 try{
  Object.assign(globals,mock)
  const art=await workstation(canvas)
  const cfg:Config=await readData('counter.json'),tuning:Tuning=await readData('tuning.json')
  const g=new Bench(cfg,tuning)
  const render=(seconds:number)=>{for(let i=0;i<g.ticks(seconds);i++){g.step();art.draw(g,0,0,{x:0,y:0,...stage})}}
  g.command({action:'steam',texture:'silky'});g.command({action:'steam',texture:'airy'})
  g.command({action:'pull',shot:'standard'});g.command({action:'cup',cup:'bowl',size:'Medium'})
  render(Math.max(g.data.stations.standard,g.data.stations.steamer)+.5)
  g.command({action:'pour',head:0,lane:0,slot:0});render(g.data.stations.transfer+.5)
  for(const add of ['milk','foam'] as const){g.command({action:'add',add,slot:0});render(g.data.stations.finish+.5)}
  assert.equal(g.recipe(g.cups[0]!), 'cappuccino')
  for(const key of ['brass-group','manometer','shot-glass','steam-wand','hot-spigot'])assert.ok(painted.has('/station/'+key+'.webp'),key)
  assert.ok(painted.has('/counter/vapor.webp'))
 }finally{
  for(const [key,value] of Object.entries(previous)){if(value===undefined)delete globals[key];else globals[key]=value}
 }
})
