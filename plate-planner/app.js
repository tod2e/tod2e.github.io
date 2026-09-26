import {ROWS, blankWells, wellName, rectangle, plateCSV, readPlate} from './model.mjs';
const $ = id => document.getElementById(id);
const KEY = 'bens-toolbox-plate-v1';
let plate = {name:'',wells:blankWells()}, storageReady=true;
try { const raw=localStorage.getItem(KEY); if(raw) { const loaded=readPlate(JSON.parse(raw)); if(loaded) plate=loaded; else storageReady=false; } } catch { storageReady=false; }
const selected = new Set();
let anchor = null, undoAction = null;
function storageNote() { $('storageStatus').textContent=storageReady?'Your layout saves in this browser.':'Browser storage is unavailable or contains unreadable data. Export your layout to keep it.'; }
function save() { try { localStorage.setItem(KEY,JSON.stringify(plate)); storageReady=true; } catch {storageReady=false;} storageNote(); }
function message(text) { $('status').textContent=text; }
function rememberChange(entire=false) {
  undoAction={wells:plate.wells.map(w=>({...w})),name:entire?plate.name:null};
  $('undoPlate').disabled=false;
}
function selectionDetails() {
  if(!selected.size){$('wellDetails').textContent='Select a well to inspect its labels.';return;}
  const wells=[...selected].map(i=>plate.wells[i]),samples=new Set(wells.map(w=>w.sample)),conditions=new Set(wells.map(w=>w.condition));
  const common=samples.size===1&&conditions.size===1;
  $('sample').value=samples.size===1?wells[0].sample:'';
  $('condition').value=conditions.size===1?wells[0].condition:'';
  $('color').value=wells[0].color;
  $('wellDetails').textContent=common?`${selected.size===1?wellName([...selected][0]):'All selected wells'} · Sample: ${wells[0].sample||'empty'} · Condition: ${wells[0].condition||'empty'}`:'Selected wells have mixed labels. Applying will replace the sample, condition, and color in every selected well.';
}
function renderSelection() {
  $('selectionCount').textContent=`${selected.size} well${selected.size===1?'':'s'} selected`;
  $('applyLabels').disabled=!selected.size; $('clearWells').disabled=!selected.size;
  for(const button of $('plate').querySelectorAll('.well')) button.setAttribute('aria-pressed',String(selected.has(Number(button.dataset.index))));
  for(const button of $('plate').querySelectorAll('.axis-button')) {
    const indexes=axisWells(button.dataset.axis,Number(button.dataset.axisIndex));
    button.setAttribute('aria-pressed',String(indexes.every(i=>selected.has(i))));
  }
  selectionDetails();
}
function renderWells() {
  selectionDetails();
  for(const button of $('plate').querySelectorAll('.well')) {
    const i=Number(button.dataset.index), w=plate.wells[i], description=[wellName(i),w.sample,w.condition].filter(Boolean).join(' · ');
    button.title=description; button.setAttribute('aria-label',description+(w.sample||w.condition?'':' · empty'));
    button.classList.toggle('has-label',Boolean(w.sample||w.condition)); button.style.setProperty('--well-color',w.color);
    button.querySelector('.well-dot').hidden=!(w.sample||w.condition);
  }
}
function axisWells(kind,index) {
  return kind==='row'?Array.from({length:12},(_,c)=>index*12+c):Array.from({length:8},(_,r)=>r*12+index);
}
function axis(text,kind,index) {
  const el=document.createElement(kind?'button':'span');el.className='plate-axis';el.textContent=text;
  if(!kind){el.setAttribute('aria-hidden','true');return el;}
  el.type='button';el.classList.add('axis-button');el.dataset.axis=kind;el.dataset.axisIndex=index;
  el.setAttribute('aria-label',`${kind==='row'?'Row':'Column'} ${text}`);el.setAttribute('aria-pressed','false');el.title=`Select or deselect ${kind} ${text}`;
  el.addEventListener('click',()=>{const indexes=axisWells(kind,index),remove=indexes.every(i=>selected.has(i));for(const i of indexes)remove?selected.delete(i):selected.add(i);anchor=null;renderSelection();});
  return el;
}
$('plate').append(axis(''));
for(let c=1;c<=12;c++) $('plate').append(axis(c,'column',c-1));
for(let r=0;r<8;r++) {
  $('plate').append(axis(ROWS[r],'row',r));
  for(let c=0;c<12;c++) {
    const i=r*12+c, button=document.createElement('button'); button.className='well';button.type='button';button.dataset.index=i;button.setAttribute('aria-pressed','false');
    const label=document.createElement('span');label.textContent=wellName(i);const dot=document.createElement('span');dot.className='well-dot';dot.setAttribute('aria-hidden','true');button.append(label,dot);
    button.addEventListener('click',event=>{if(event.shiftKey&&anchor!==null) rectangle(anchor,i).forEach(index=>selected.add(index));else {if(selected.has(i))selected.delete(i);else selected.add(i);anchor=i;}renderSelection();});
    button.addEventListener('keydown',event=>{const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-12,ArrowDown:12}[event.key];if(delta!==undefined){event.preventDefault();const next=i+delta;if(next>=0&&next<96)$('plate').querySelector(`[data-index="${next}"]`).focus();}});
    $('plate').append(button);
  }
}
$('plateName').value=plate.name; $('plateName').addEventListener('input',()=>{plate.name=$('plateName').value;save();});
$('selectAll').addEventListener('click',()=>{for(let i=0;i<96;i++)selected.add(i);renderSelection();});
$('selectNone').addEventListener('click',()=>{selected.clear();anchor=null;renderSelection();});
$('labelForm').addEventListener('submit',event=>{event.preventDefault();if(!selected.size)return;const sample=$('sample').value.trim(),condition=$('condition').value.trim();if(!sample&&!condition){message('Add a sample or condition first. Use Clear selected wells to remove labels.');return;}rememberChange();for(const i of selected)plate.wells[i]={sample,condition,color:$('color').value};save();renderWells();message(`Updated ${selected.size} selected wells.`);});
$('clearWells').addEventListener('click',()=>{if(!selected.size)return;rememberChange();for(const i of selected)plate.wells[i]={sample:'',condition:'',color:'#f39876'};save();renderWells();message(`Cleared ${selected.size} selected wells.`);});
$('clearPlate').addEventListener('click',()=>{if(!confirm('Clear the plate name and all 96 wells? Export a CSV first if you need this layout.'))return;rememberChange(true);plate={name:'',wells:blankWells()};$('plateName').value='';$('sample').value='';$('condition').value='';$('color').value='#f39876';selected.clear();anchor=null;save();renderWells();renderSelection();message('Plate cleared.');});
$('undoPlate').addEventListener('click',()=>{
  if(!undoAction)return;
  plate.wells=undoAction.wells;
  if(undoAction.name!==null&&!plate.name){plate.name=undoAction.name;$('plateName').value=plate.name;}
  undoAction=null;$('undoPlate').disabled=true;save();renderWells();renderSelection();message('Restored the previous layout.');
});
$('exportPlate').addEventListener('click',()=>{const blob=new Blob([plateCSV(plate)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(plate.name||'plate-layout').replace(/[^a-z0-9_-]+/gi,'-').slice(0,100)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Exported all 96 wells. Labels that could be spreadsheet formulas are prefixed with an apostrophe.');});
storageNote();renderWells();renderSelection();
