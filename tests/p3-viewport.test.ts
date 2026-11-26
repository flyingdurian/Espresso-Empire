import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {immersiveMode,toggleImmersive} from '../src/counter/immersive.ts'
import {visibleStage,viewportMoved} from '../src/counter/viewport-fit.ts'
import {counterTravel,type Area} from '../src/counter/counter-travel.ts'
const source=(name:string)=>readFileSync(new URL('../'+name,import.meta.url),'utf8')
const stage={w:1672,h:941}
test('fullscreen state reflects actual document and standalone mode',()=>{
 assert.equal(immersiveMode(false,false),'browser');assert.equal(immersiveMode(false,true),'standalone');assert.equal(immersiveMode(true,true),'fullscreen')
})
test('fullscreen enters and exits only through supported requests',async()=>{
 let calls=0
 assert.equal(await toggleImmersive({mode:()=> 'browser',request:async()=>{calls++}}),'changed')
 assert.equal(await toggleImmersive({mode:()=> 'fullscreen',exit:async()=>{calls++}}),'changed')
 assert.equal(await toggleImmersive({mode:()=> 'standalone',request:async()=>{calls++}}),'standalone');assert.equal(calls,2)
})
test('unsupported or rejected fullscreen offers guide; failed exit remains a distinct result',async()=>{
 assert.equal(await toggleImmersive({mode:()=> 'browser'}),'guide')
 assert.equal(await toggleImmersive({mode:()=> 'browser',request:async()=>{throw Error('Denied')}}),'guide')
 assert.equal(await toggleImmersive({mode:()=> 'fullscreen',exit:async()=>{throw Error('Denied')}}),'failed-exit')
})
test('visible stage uses client rectangles, with safe-area offsets applied exactly once',()=>{
 const scene={left:40,top:50,width:560,height:315},frame={left:22,top:48,width:596,height:333}
 assert.deepEqual(visibleStage(scene,frame,stage),{x:0,y:0,w:1672,h:941,width:560,height:315})
 const clip=visibleStage(scene,{left:50,top:65,width:520,height:285},stage)!
 assert.equal(clip.width,520);assert.equal(clip.height,285);assert.equal(clip.x,10*1672/560);assert.equal(clip.y,15*941/315)
 assert.equal(visibleStage(scene,{left:800,top:0,width:100,height:100},stage),null)
 assert.equal(visibleStage({...scene,width:0},frame,stage),null)
})
test('viewport movement detects translation as well as size, ignoring tiny subpixel jitter',()=>{
 const a={left:40,top:48,width:560,height:315}
 assert.equal(viewportMoved(a,{...a,left:40.25}),false)
 for(const key of ['left','top','width','height'] as const)assert.equal(viewportMoved(a,{...a,[key]:a[key]+2}),true)
})
test('layout cancellation stops in-flight counter swipe but preserves committed turn',()=>{
 const listeners=new Map<string,((e:any)=>void)[]>(),turns:Area[]=[]
 const surface={clientWidth:560,classList:{add(){},remove(){}},setPointerCapture(){},addEventListener:(type:string,fn:(e:any)=>void)=>{listeners.set(type,[...(listeners.get(type)??[]),fn])}} as unknown as HTMLElement
 const old=Object.getOwnPropertyDescriptor(globalThis,'window');Object.defineProperty(globalThis,'window',{configurable:true,value:{addEventListener(){}}})
 let travel:ReturnType<typeof counterTravel>
 try{travel=counterTravel(surface,()=> 'Door',()=>false,v=>turns.push(v))}finally{if(old)Object.defineProperty(globalThis,'window',old);else Reflect.deleteProperty(globalThis,'window')}
 const emit=(type:string,x:number,timeStamp:number)=>{for(const fn of listeners.get(type)??[])fn({type,isPrimary:true,button:0,pointerId:1,clientX:x,clientY:100,timeStamp,target:{closest:()=>null}})}
 emit('pointerdown',300,0);emit('pointermove',120,50);assert.equal(travel.frame(undefined)?.to,'Window');travel.cancelForLayout();emit('pointerup',120,60);assert.deepEqual(turns,[])
 emit('pointerdown',300,100);emit('pointermove',120,150);emit('pointerup',120,160);assert.deepEqual(turns,['Window']);travel.cancelForLayout();assert.equal(travel.frame('Window')?.to,'Window')
})
test('active entry wires immersive, dynamic sizing, recipe-only compact rail and stale-release protection',()=>{
 const html=source('index.html'),css=source('src/counter/style.css'),main=source('src/counter/main.ts')
 assert.match(html,/viewport-fit=cover/);assert.match(html,/id="fullscreen"/);assert.match(html,/apple-mobile-web-app-capable/)
 assert.match(css,/height:100vh;height:100svh;height:100dvh/);assert.match(css,/padding:env\(safe-area-inset-top\) env\(safe-area-inset-right\) env\(safe-area-inset-bottom\) env\(safe-area-inset-left\)/)
 assert.match(css,/#app\[data-rail-kind=recipes\] \.workspace\{grid-template-columns:minmax\(0,1fr\) clamp\(152px,22%,180px\)\}/)
 assert.match(css,/#recipe-rail \.ingredients\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
 assert.match(main,/bindImmersive\(el<HTMLButtonElement>\('fullscreen'\)/);assert.match(main,/visualViewport\?\.addEventListener\('resize',refreshViewport\)/)
 assert.match(main,/sizeCanvas\(\);if\(!drag\)\{releaseLayoutPointer\(e\);return\}/);assert.match(main,/cancelledLayoutPointer=drag.id;skip=drag.source;abortGesture\(\)/)
})
