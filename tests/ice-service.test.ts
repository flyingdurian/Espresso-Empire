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
 assert.deepEqual(layers,['scoop-empty','cube-1','cube-2','cube-3'])
 layers.length=0
 scoopWithIce(context,draw,0,0,38,0,1,1)
 assert.deepEqual(layers,['scoop-empty'])
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
