/** Fullscreen on browsers that support document fullscreen; iOS Safari may not. */
export type ImmersiveMode='fullscreen'|'standalone'|'browser'
export function immersiveMode(fullscreen:boolean,standalone:boolean):ImmersiveMode{
 return fullscreen?'fullscreen':standalone?'standalone':'browser'
}
export type ImmersivePort={mode:()=>ImmersiveMode;request?:()=>Promise<void>;exit?:()=>Promise<void>}
export async function toggleImmersive(port:ImmersivePort):Promise<'changed'|'standalone'|'guide'|'failed-exit'>{
 const mode=port.mode()
 if(mode==='standalone')return 'standalone'
 if(mode==='fullscreen'){
  try{if(port.exit){await port.exit();return 'changed'}}catch{/* retain actual fullscreen state */}
  return 'failed-exit'
 }
 try{if(port.request){await port.request();return 'changed'}}catch{/* unsupported or rejected */}
 return 'guide'
}
export function bindImmersive(button:HTMLButtonElement,guide:()=>void,failedExit:()=>void){
 const standalone=window.matchMedia('(display-mode: standalone)')
 const mode=()=>immersiveMode(!!document.fullscreenElement,standalone.matches||(navigator as Navigator&{standalone?:boolean}).standalone===true)
 const port:ImmersivePort={mode,
  request:document.fullscreenEnabled!==false&&typeof document.documentElement.requestFullscreen==='function'?()=>document.documentElement.requestFullscreen():undefined,
  exit:typeof document.exitFullscreen==='function'?()=>document.exitFullscreen():undefined}
 function update(){
  const state=mode(),label=state==='fullscreen'?'Exit full screen':state==='standalone'?'Running as a home screen app':'Full screen or home screen setup'
  button.textContent=state==='fullscreen'?'Exit':state==='standalone'?'App':'Full'
  button.setAttribute('aria-label',label);button.title=label
  button.setAttribute('aria-pressed',String(state!=='browser'));button.disabled=state==='standalone'
 }
 let pending=false
 button.addEventListener('click',async()=>{
  if(pending)return;pending=true
  try{const result=await toggleImmersive(port);if(result==='guide')guide();else if(result==='failed-exit')failedExit()}
  finally{pending=false;update()}
 })
 document.addEventListener('fullscreenchange',update);standalone.addEventListener('change',update);window.addEventListener('pageshow',update);update()
}
