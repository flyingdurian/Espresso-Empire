import {Application, Container, Sprite, Texture} from 'pixi.js'
export type Piece={id:string;x:number;y:number;w:number;h:number;angle?:number;px?:number;py?:number;alpha?:number}
export async function paintedSurface(host:HTMLElement, sources:Record<string,string>){
  const art=Object.keys(sources)
  const bitmaps=new Map<string,HTMLImageElement>()
  await Promise.all(art.map(async id=>{
    const image=new Image();image.src=sources[id];await image.decode();bitmaps.set(id,image)
  }))
  const pieces:Piece[]=[]
  let draw:()=>void, canvas:HTMLCanvasElement
  try{
    const app=new Application()
    await app.init({width:1600,height:900,preference:'webgl',resolution:1,antialias:true,autoStart:false})
    canvas=app.canvas as HTMLCanvasElement
    const textures=new Map<string,Texture>();for(const id of art)textures.set(id,Texture.from(bitmaps.get(id)!))
    const group=new Container();app.stage.addChild(group)
    const sprites:Sprite[]=[]
    draw=()=>{
      for(let i=0;i<pieces.length;i++){
        const p=pieces[i];let s=sprites[i];if(!s){s=new Sprite();sprites.push(s);group.addChild(s)}
        s.visible=true;s.texture=textures.get(p.id)!;s.anchor.set(p.px??0,p.py??0);s.position.set(p.x,p.y)
        s.width=p.w;s.height=p.h;s.rotation=p.angle??0;s.alpha=p.alpha??1
      }
      for(let i=pieces.length;i<sprites.length;i++)sprites[i].visible=false
      app.render()
    }
  }catch{
    canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900
    const ctx=canvas.getContext('2d')!
    draw=()=>{
      ctx.clearRect(0,0,1600,900)
      for(const p of pieces){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle??0);ctx.globalAlpha=p.alpha??1
        ctx.drawImage(bitmaps.get(p.id)!,-(p.px??0)*p.w,-(p.py??0)*p.h,p.w,p.h);ctx.restore()}
    }
  }
  canvas.setAttribute('aria-hidden','true');host.append(canvas)
  function prop(id:string,cx:number,bottom:number,h:number,angle=0,alpha=1){
    const img=bitmaps.get(id)!;pieces.push({id,x:cx,y:bottom,w:h*img.width/img.height,h,px:.5,py:1,angle,alpha})
  }
  return {pieces,prop,draw,bitmaps,canvas}
}
