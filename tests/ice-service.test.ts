import {strict as assert} from 'node:assert'
import test from 'node:test'
import {scoopPose,scoopWithIce,iceWell} from '../src/counter/ice-service.ts'

const context=new Proxy({}, {get:()=>()=>{}}) as CanvasRenderingContext2D

test('scoop starts empty, digs at the well, and follows the hand once filled',()=>{
 const target={x:500,y:420}
 const start=scoopPose(0,target),dig=scoopPose(140,target),carried=scoopPose(300,target)
 assert.equal(start.load,0)
 assert.ok(dig.x<start.x && dig.y>start.y)
 assert.deepEqual([carried.x,carried.y,carried.load],[500,433,1])
 const layers:string[]=[]
 const draw=(key:string)=>{layers.push(key)}
 scoopWithIce(context,draw,0,0,38,0,1,0)
 assert.deepEqual(layers,['empire_ice_scoop','empire_ice_cube_1','empire_ice_cube_2','empire_ice_cube_3'])
 layers.length=0
 scoopWithIce(context,draw,0,0,38,0,1,1)
 assert.deepEqual(layers,['empire_ice_scoop'])
})

test('each stock change reveals more of the well while remaining cubes stay seated',()=>{
 const seats=(stock:number)=>{
  const points:string[]=[]
  iceWell(context,(_key,x,y)=>points.push([x,y].join('/')),stock,8)
  return points
 }
 for(let n=8;n>0;n--){
  const before=seats(n),after=seats(n-1)
  assert.ok(after.length<before.length)
  assert.ok(after.every(point=>before.includes(point)))
 }
 assert.deepEqual(seats(0),[])
})

test('Empire ice overlay assets are isolated, each cube has a unique rank, and the resting scoop matches the pour origin',async()=>{
 const {iceAssets,iceAssetPath,iceSeats,iceScoopHome,iceRim}=await import('../src/counter/ice-service.ts')
 const {tool}=await import('../src/counter/drink-motion.ts')
 const {existsSync}=await import('node:fs')
 for(const id of iceAssets){assert.ok(id.startsWith('empire_ice_'));assert.ok(existsSync(new URL('../public'+iceAssetPath(id),import.meta.url)))}
 const full=iceSeats(6,6);assert.equal(full.length,72);assert.equal(new Set(full.map(s=>s.rank)).size,full.length)
 assert.deepEqual(tool('ice',0,0).home,iceScoopHome);assert.equal(tool('ice',0,0).h,iceScoopHome.h)
 assert.ok(iceScoopHome.x>iceRim.x&&iceScoopHome.x<iceRim.x+iceRim.w)
 assert.ok(iceScoopHome.y>iceRim.y&&iceScoopHome.y<iceRim.y+iceRim.h)
 for(let stock=6;stock>0;stock--){const a=iceSeats(stock,6),b=iceSeats(stock-1,6);assert.ok(a.length>b.length);assert.ok(b.every(p=>a.some(q=>q.rank===p.rank&&q.x===p.x&&q.y===p.y)))}
})
