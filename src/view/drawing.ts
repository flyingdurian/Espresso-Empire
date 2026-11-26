// Diagnostic elevation drawn in architectural symbols. Geometry is presentation-only.
import type {Content} from '../content/model.ts'
import {zone,type Snapshot} from '../sim/simulation.ts'
const W=1000,H=550
export function drawElevation(canvas:HTMLCanvasElement,data:Content,s:Snapshot,selected:string) {
  canvas.width=W*1.5;canvas.height=H*1.5
  const c=canvas.getContext('2d')!
  c.scale(1.5,1.5)
  const ink='#d0d0a7',dim='#779486',paper='#e5dec5',warm='#f1b77b',deep='#203f38'
  const line=(points:number[],color=ink,w=1.5,fill='')=>{
    c.beginPath();c.moveTo(points[0],points[1])
    for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1])
    if(fill){c.closePath();c.fillStyle=fill;c.fill()}
    if(w){c.strokeStyle=color;c.lineWidth=w;c.stroke()}
  }
  const rect=(x:number,y:number,w:number,h:number,color=ink,fill='',lw=1.5)=>{
    if(fill){c.fillStyle=fill;c.fillRect(x,y,w,h)}
    if(lw){c.strokeStyle=color;c.lineWidth=lw;c.strokeRect(x,y,w,h)}
  }
  const circ=(x:number,y:number,r:number,color=ink,fill='',lw=1.5)=>{
    c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill()}if(lw){c.strokeStyle=color;c.lineWidth=lw;c.stroke()}
  }
  const label=(t:string,x:number,y:number,size=13,color=ink,bold=false)=>{
    c.font=(bold?'bold ':'')+size+'px ui-monospace, Menlo, monospace';c.fillStyle=color;c.fillText(t,x,y)
  }
  function hatch(x:number,y:number,w:number,h:number,spacing=7){
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip()
    for(let i=-h;i<w;i+=spacing)line([x+i,y+h,x+i+h,y],dim,.8)
    c.restore()
  }
  function plant(x:number,y:number,scale:number) {
    c.save();c.translate(x,y);c.scale(scale,scale)
    line([-10,-15,10,-15,7,0,-7,0,-10,-15]);line([0,-15,0,-55])
    for(let i=0;i<6;i++){const d=i%2?1:-1, yy=-22-i*5;line([0,yy,d*(15-i),yy-11,d*(5+i/2),yy-9,0,yy],dim,1.4)}
    c.restore()
  }
  function table(x:number,y:number) {
    rect(x-22,y-27,44,4);line([x,y-22,x,y-2,x-9,y]);line([x,y-2,x+9,y])
    for(const d of [-1,1]){
      line([x+d*37,y-29,x+d*36,y-13,x+d*20,y-13]);line([x+d*34,y-12,x+d*36,y]);line([x+d*23,y-12,x+d*21,y])
    }
    rect(x-4,y-35,7,7,ink,deep);line([x+3,y-33,x+7,y-33,x+7,y-30,x+3,y-30],ink,1)
  }
  const grad=c.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#2d5044');grad.addColorStop(1,'#152f2d')
  c.fillStyle=grad;c.fillRect(0,0,W,H)
  for(let x=0;x<W;x+=20)line([x,0,x,H],'#466258',x%100===0?.8:.4)
  for(let y=0;y<H;y+=20)line([0,y,W,y],'#466258',y%100===0?.8:.4)
  // Dimension witness marks and printed registration corners.
  for(const [x,y,sx,sy] of [[19,19,1,1],[981,19,-1,1],[19,531,1,-1],[981,531,-1,-1]])line([x+sx*14,y,x,y,x,y+sy*14],dim,1)
  const left=137,right=830,shaft=744
  line([left,56,right,56],dim,.9)
  for(const x of [left,shaft,right]){line([x,48,x,64],dim);line([x-4,60,x+4,52],ink)}
  label('BUILDING  /  01',left,43,12,dim);label('SECTION A–A',730,43,12,dim)
  // A roof canopy over the open terrace; parapets and joists share the same alignment.
  line([left-8,132,left-8,124,178,124,206,94,655,94,691,124,shaft,124,shaft,132],ink,2)
  for(let i=0;i<14;i++){let x=178+i*34;line([x,124,x+28-(i*4.5),96],dim,1.1)}
  rect(169,125,529,6,ink,deep);line([187,132,187,230,193,230,193,132],ink);line([683,132,683,230,689,230,689,132],ink)
  // Elevator headhouse and wall section.
  rect(shaft-5,99,right-shaft+10,8,ink,deep);rect(shaft,108,right-shaft,366,ink,'#24413b')
  for(const x of [left,left+9,shaft-8,shaft,right,right+8]) line([x,232,x,475],ink,1.5)
  for(const floor of [228,347,467]) {
    rect(left-8,floor,right-left+24,10,ink,deep);hatch(left-7,floor+1,right-left+22,8)
    line([left-10,floor+13,right+18,floor+13],dim,1)
    rect(shaft+14,floor-74,56,73);rect(shaft+18,floor-70,48,69,dim);line([shaft+42,floor-69,shaft+42,floor-1]);rect(shaft+73,floor-42,5,10,dim)
  }
  // Lounge mullions, arched glazing, banquette tables and pendant lamps.
  for(let i=0;i<4;i++){
    const x=217+i*140
    c.beginPath();c.arc(x,285,34,Math.PI,Math.PI*2);c.strokeStyle=dim;c.lineWidth=1.2;c.stroke()
    line([x-34,285,x-34,321,x+34,321,x+34,285],dim,1.2);line([x,252,x,320],dim,1);line([x-34,283,x+34,283],dim,1)
    table(x,345);table(x,226)
  }
  for(const x of [286,426,566]){line([x,242,x,262],dim,1);line([x-7,266,x-3,262,x+3,262,x+7,266,x-7,266],ink,1)}
  for(let x=188;x<690;x+=15)line([x,203,x,225],dim,1)
  line([188,202,690,202],ink);plant(161,226,.85);plant(708,226,.95);plant(713,345,.72)
  // Bar elevation: group head, grinder, cups and under-counter cabinetry.
  rect(182,432,483,7,ink,deep);rect(189,440,468,26,dim)
  for(const x of [230,292,354,416,478,540,602])line([x,441,x,465],dim,1)
  for(const x of [207,260,313,366,419,472,525,578,631])line([x-6,446,x+6,446],ink,1)
  rect(230,394,105,30,ink,deep,2);rect(235,398,94,10,dim)
  for(const x of [250,278,309]){circ(x,403,3);line([x-3,410,x-3,415,x+7,415],ink);rect(x-4,419,9,5)}
  rect(227,427,111,4);line([230,424,230,427]);line([333,424,333,427])
  line([374,390,400,390,395,405,381,405,374,390],ink,1.5);rect(382,406,13,16);rect(377,424,23,7)
  for(let i=0;i<4;i++) {rect(474+i*24,419,14,12);line([488+i*24,421,492+i*24,421,492+i*24,425,488+i*24,425])}
  rect(450,394,151,3,dim);for(let i=0;i<6;i++)rect(455+i*23,381,13,11,dim)
  line([116,482,859,482],dim);hatch(138,484,698,8,9)
  const ys=[177,295,412]
  data.building.sections.forEach((floor,i)=>{
    const y=ys[i]; if(y===undefined)return
    const focus=floor.id===selected,here=floor.id===s.section
    label(floor.id,44,y,26,focus?warm:paper,true);label(floor.name.toUpperCase(),44,y+17,12,dim)
    line([102,y-8,128,y-8],focus?warm:dim,focus?2:1)
    if(here){circ(shaft+42,y-11,11,warm,warm);line([shaft+38,y-11,shaft+41,y-8,shaft+47,y-15],deep,2.4)}
    if(focus)line([right+16,y-26,right+22,y-26,right+22,y+19,right+16,y+19],warm,2)
    const orders=s.orders.filter(o=>o.section===floor.id&&o.remaining>0)
    for(const o of orders){
      const ix=floor.seats.indexOf(o.seat),x=217+ix*140
      const z=zone(o,data.tuning.zoneBoundaries),col=z==='Urgent'?'#ff9c77':z==='Waiting'?'#f1d190':'#bddec1'
      rect(x-21,i===0?144:263,42,21,col,deep,1.4)
      label(o.seat,x-10,i===0?159:278,13,col,true)
    }
  })
  label('A',116,511,13,dim);line([134,506,826,506],dim,.8);label('A',839,511,13,dim)
}
