export type ViewRect={left:number;top:number;width:number;height:number}
export function viewportMoved(previous:ViewRect,next:ViewRect,tolerance=.5):boolean{
 return (['left','top','width','height'] as const).some(key=>Math.abs(previous[key]-next[key])>tolerance)
}
/** The artwork and the DOM share client coordinates; never apply a second safe-area offset. */
export function visibleStage(scene:ViewRect,frame:ViewRect,stage:{w:number;h:number}){
 if(scene.width<=0||scene.height<=0)return null
 const left=Math.max(scene.left,frame.left),top=Math.max(scene.top,frame.top)
 const width=Math.min(scene.left+scene.width,frame.left+frame.width)-left
 const height=Math.min(scene.top+scene.height,frame.top+frame.height)-top
 if(width<=0||height<=0)return null
 const sx=stage.w/scene.width,sy=stage.h/scene.height
 return {x:(left-scene.left)*sx,y:(top-scene.top)*sy,w:width*sx,h:height*sy,width,height}
}
