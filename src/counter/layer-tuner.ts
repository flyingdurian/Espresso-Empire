import {identity,layerIds,previewStates,parseLayerMap,serializeLayerMap,type LayerMap,type LayerTransform,type PreviewState} from './layer-overrides.ts'
import {stackSpec} from './cup-stack-spec.ts'
const key='via-bianca-layer-overrides-v1'
export function layerTuner(change:()=>void,exit:()=>void){
 let map:LayerMap={},selected:string=layerIds[0],state:PreviewState='current',view:'current'|'Door'|'Window'|'Kitchen'='current'
 try{const saved=JSON.parse(localStorage.getItem(key)??'{}');map=parseLayerMap(Object.fromEntries(Object.entries(saved).filter(([id])=>!id.startsWith('cup-stack/'))))}catch{}
 const panel=document.createElement('section');panel.id='layer-tuner';panel.hidden=true;panel.setAttribute('aria-label','Developer layer tuner')
 const make=<T extends keyof HTMLElementTagNameMap>(tag:T,text='')=>{const n=document.createElement(tag);n.textContent=text;return n}
 const button=(label:string,action:()=>void)=>{const n=make('button',label);n.type='button';n.onclick=action;return n}
 const select=<T extends string>(values:readonly T[])=>{const n=make('select');for(const v of values){const opt=make('option',v);opt.value=v;n.append(opt)}return n}
 const row=(label:string,n:HTMLElement)=>{const l=make('label',label);l.append(n);return l}
 const choices=select(layerIds),states=select(previewStates(selected)),views=select(['current','Door','Window','Kitchen'] as const)
 const msg=make('output','Preview only • shift paused • controls unchanged')
 const json=make('textarea');json.rows=5;json.spellcheck=false;json.setAttribute('aria-label','Layer override JSON')
 for(const opt of choices.options){const spec=stackSpec(opt.value);if(spec)opt.textContent=spec.label+' · '+spec.id}
 const fields={} as Record<keyof Omit<LayerTransform,'stackOffset'>,HTMLInputElement>
 const grid=make('div');grid.className='tuner-grid'
 for(const [name,min,max,step] of [['x',-1672,1672,1],['y',-941,941,1],['rotation',-180,180,1],['scaleX',.25,3,.01],['scaleY',.25,3,.01]] as const){
  const n=make('input');n.type='number';n.min=String(min);n.max=String(max);n.step=String(step);fields[name]=n
  n.oninput=()=>{if(!Number.isFinite(n.valueAsNumber))return;try{map=parseLayerMap({...map,[selected]:{...(map[selected]??identity),[name]:n.valueAsNumber}});json.value=serializeLayerMap(map);change()}catch{/* allow intermediate number entry */}}
  n.onchange=()=>{try{map=parseLayerMap({...map,[selected]:{...(map[selected]??identity),[name]:n.valueAsNumber}});update();change()}catch(e){msg.textContent=(e as Error).message;syncFields()}}
  grid.append(row(name,n))
 }
 const offset=make('input');offset.type='number';offset.min='.05';offset.max='.6';offset.step='.01';const offsetRow=row('Stack offset / height',offset);grid.append(offsetRow)
 offset.onchange=()=>{try{map=parseLayerMap({...map,[selected]:{...(map[selected]??identity),stackOffset:offset.valueAsNumber}});update();change()}catch(e){msg.textContent=(e as Error).message;syncFields()}}
 const syncFields=()=>{const value=map[selected]??identity;for(const name of Object.keys(fields) as (keyof Omit<LayerTransform,'stackOffset'>)[])fields[name].value=String(value[name]);const spec=stackSpec(selected);offsetRow.hidden=!spec;offset.disabled=!spec;offset.value=spec?String(value.stackOffset??spec.offset):''}
 function update(){syncFields();json.value=serializeLayerMap(map);try{localStorage.setItem(key,json.value)}catch{}msg.textContent='Preview only • shift paused • controls unchanged'}
 choices.onchange=()=>{selected=choices.value;state='current';states.replaceChildren(...Array.from(select(previewStates(selected)).options));states.value=state;states.disabled=states.options.length===1;if(selected.startsWith('rear/')){view='Kitchen';views.value=view}else if(selected.startsWith('front/')){view='Door';views.value=view}syncFields();change()}
 states.onchange=()=>{state=states.value as PreviewState;change()}
 views.onchange=()=>{view=views.value as typeof view;change()}
 function load(raw:string){try{map=parseLayerMap(JSON.parse(raw));update();change()}catch(e){msg.textContent=(e as Error).message}}
 const file=make('input');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','Import override file');file.hidden=true
 file.onchange=async()=>{try{if(file.files?.[0])load(await file.files[0].text())}catch(e){msg.textContent=(e as Error).message}finally{file.value=''}}
 function save(){const blob=new Blob([serializeLayerMap(map)],{type:'application/json'}),url=URL.createObjectURL(blob);const a=make('a');a.href=url;a.download='via-bianca-layer-overrides.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 const actions=make('div');actions.className='tuner-actions'
 actions.append(button('Reset layer',()=>{delete map[selected];update();change()}),button('Copy JSON',()=>{json.value=serializeLayerMap(map);json.focus();json.select();if(navigator.clipboard?.writeText)navigator.clipboard.writeText(json.value).then(()=>msg.textContent='JSON copied').catch(()=>msg.textContent='Select and copy the JSON manually');else msg.textContent='Select and copy the JSON manually'}),button('Load JSON',()=>load(json.value)),button('Save file',save),button('Open file',()=>file.click()))
 const top=make('div');top.className='tuner-actions tuner-top';top.append(button('Close',exit),button('Move panel',()=>panel.classList.toggle('left')))
 states.disabled=states.options.length===1;const previewRow=make('div');previewRow.className='tuner-preview-row';previewRow.append(row('View',views),row('State preview',states));panel.append(top,make('strong','Layer tuner · plate locked'),previewRow,row('Overlay',choices),grid,actions,json,file,msg);document.body.append(panel);update()
 return {panel,show(){panel.hidden=false;update();choices.focus()},hide(){panel.hidden=true},get map(){return map},get selected(){return selected},get state(){return state},get view(){return view}}
}
