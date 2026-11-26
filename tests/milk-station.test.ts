import {strict as assert} from 'node:assert'
import {readFile} from 'node:fs/promises'
import test from 'node:test'
import {drawMilkPitcher,drawSteamLane,loadMilkArt,milkCycle} from '../src/counter/milk-station.ts'

test('both steam lanes render the full active cycle using their packaged, decoded art',async()=>{
 const art=await loadMilkArt(async url=>{
  const file=await readFile(new URL('../public'+url,import.meta.url))
  assert.equal(file.toString('ascii',8,12),'WEBP',url)
  return {src:url,width:32,height:42} as HTMLImageElement
 })
 const drawn=new Set<HTMLImageElement>(),known=new Set(Object.values(art))
 let depth=0
 const ops={
  save(){depth++},restore(){assert.ok(--depth>=0)},
  drawImage(img:HTMLImageElement,...args:number[]){
   assert.ok(known.has(img),'drawImage requires a loaded image')
   assert.ok(args.every(Number.isFinite));drawn.add(img)
  }
 }
 const ctx=new Proxy(ops,{get(object,k){return Object.hasOwn(object,k)?Reflect.get(object,k):()=>{}}}) as unknown as CanvasRenderingContext2D
 for(const texture of ['silky','airy'] as const){
  drawn.clear()
  for(let i=0;i<=40;i++){
   const progress=i/40,cycle=milkCycle(texture,progress)
   drawSteamLane(ctx,art,texture,{x:125,y:320},{x:120,y:246},cycle.charge,progress,i,true)
   assert.equal(depth,0)
  }
  assert.ok(drawn.has(art[texture]));assert.ok(drawn.has(art.vapor));assert.ok(drawn.has(art.wand))
  drawn.clear()
  drawSteamLane(ctx,art,texture,{x:125,y:320},{x:120,y:246},1,0,45,false)
  assert.deepEqual([...drawn],[art.wand])
  drawMilkPitcher(ctx,art,texture,140,280,40,-.7,1,0,50)
  assert.ok(drawn.has(art.pitcher));assert.equal(depth,0)
 }
})
