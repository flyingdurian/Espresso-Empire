type Focus='prep'|'group'|'drinks'|'service'|'packing'
const anchors:Record<Focus,number>={prep:170,group:410,drinks:770,service:1080,packing:1460}
const kitchenAnchors:Record<Focus,number>={prep:225,group:610,drinks:990,service:1290,packing:1490}
const clamp=(v:number,low:number,high:number)=>Math.min(high,Math.max(low,v))
export function cameraOffset(focusX:number,sceneWidth:number,sceneHeight:number){
 const scale=sceneHeight/900
 const visibleWidth=sceneWidth/scale
 return {scale,offset:clamp(focusX-visibleWidth/2,0,Math.max(0,1600-visibleWidth))}
}
export function setupPortraitCamera(){
 const scene=document.getElementById('scene')!,world=document.getElementById('world')!,nav=document.getElementById('camera-nav')!
 const mobile=window.matchMedia('(orientation:portrait) and (max-width:760px)')
 let focus:Focus='prep',kitchen=false,personalX:number|null=null
 const buttons=[...nav.querySelectorAll<HTMLButtonElement>('button[data-focus]')]
 function update(){
  const portrait=mobile.matches
  scene.classList.toggle('portrait-camera',portrait)
  for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.focus===focus))
  if(!portrait){world.style.cssText='';return}
  const {scale,offset}=cameraOffset(personalX??(kitchen?kitchenAnchors:anchors)[focus],scene.clientWidth,scene.clientHeight)
  world.style.width='1600px';world.style.height='900px'
  world.style.transformOrigin='top left'
  world.style.transform=`translate3d(${-offset*scale}px,0,0) scale(${scale})`
 }
 function setFocus(next:Focus){focus=next;personalX=null;update()}
 buttons.forEach(b=>b.onclick=()=>setFocus(b.dataset.focus as Focus))
 let swipe:{x:number;y:number}|null=null
 scene.addEventListener('pointerdown',e=>{if((e.target as HTMLElement).closest('button'))return;swipe={x:e.clientX,y:e.clientY}},{passive:true})
 scene.addEventListener('pointerup',e=>{
  if(!mobile.matches||!swipe)return
  const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.3)return
  const choices:Focus[]=['prep','group','drinks','service','packing']
  setFocus(choices[clamp(choices.indexOf(focus)+(dx<0?1:-1),0,choices.length-1)])
 },{passive:true})
 const resize=new ResizeObserver(update);resize.observe(scene);mobile.addEventListener('change',update);window.addEventListener('resize',update)
 const full=document.getElementById('fullscreen') as HTMLButtonElement,guide=document.getElementById('immersive-guide') as HTMLDialogElement
 full.onclick=async()=>{
  const app=document.getElementById('app')!
  if(document.fullscreenElement){await document.exitFullscreen();return}
  if(typeof app.requestFullscreen==='function'){
   try{await app.requestFullscreen();return}catch{/* Safari may reject element fullscreen. */}
  }
  if(!window.matchMedia('(display-mode:standalone)').matches)guide.showModal()
 }
 document.getElementById('immersive-close')!.addEventListener('click',()=>guide.close())
 document.addEventListener('fullscreenchange',()=>{full.setAttribute('aria-pressed',String(!!document.fullscreenElement));full.querySelector('span')!.textContent=document.fullscreenElement?'Exit':'Full';update()})
 update()
 return {
  focus:setFocus,
  focusAt(x:number){focus='service';personalX=x;update()},
  kitchen(yes:boolean){if(kitchen===yes)return;kitchen=yes;focus=yes?'prep':'prep';personalX=null;buttons.forEach((b,i)=>{b.textContent=yes?['Oven','Press','Brewer','Serve','Bags'][i]:['Prep','Machine','Drinks','Serve','Bags'][i]});update()},
  update
 }
}
