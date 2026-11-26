type Icon='short'|'standard'|'silky'|'airy'|'empty'|'purge'|'water'
const outlines:Record<Icon,string>={
 short:'<path d="M4 5.5h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 7h1.8c3.3 0 2.2 5-1.8 5M3 18h15"/><path class="ink" d="M6 11h8c-.5 4-7.5 4-8 0z"/>',
 standard:'<path d="M3 4h13v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM16 6h2c3 0 2.5 6-2 6M2 18h17"/><path class="ink" d="M5 8h9v3c0 4-9 4-9 0z"/>',
 silky:'<path d="M2 9c5-7 9 5 17-2M2 14c5-7 9 5 17-2"/>',
 airy:'<circle cx="6" cy="12" r="3.7"/><circle cx="14" cy="6.4" r="3"/><circle cx="15.5" cy="15" r="2.3"/>',
 empty:'<path d="M6 6h10l-1 10H8z" opacity=".65"/>',
 purge:'<path d="M4 4h13M5 8l-2 4m7-4v5m5-5 2 4M3 17h15"/>',
 water:'<path d="M10.5 2C9 5.3 4.4 9.5 4.4 13.1a6.1 6.1 0 0 0 12.2 0C16.6 9.5 12.2 5.3 10.5 2zM7.5 13.2c.1 1.4 1 2.4 2.4 2.8"/>'
}
export function machineControl(icon:Icon,stock?:number){
 const face=document.createElement('span')
 face.className='control-face'
 face.innerHTML='<svg viewBox="0 0 21 20" aria-hidden="true" focusable="false">'+outlines[icon]+'</svg>'
 const marks=stock??(icon==='short'?1:icon==='standard'?2:0)
 if(marks>0){
  const dots=document.createElement('span');dots.className='control-marks'
  for(let i=0;i<marks;i++)dots.append(document.createElement('i'))
  face.append(dots)
 }
 face.dataset.symbol=icon
 return face
}
