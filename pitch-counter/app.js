import {TYPES,localDate,stats,byInning,pitchCSV,readOuting} from './model.mjs';
const $=id=>document.getElementById(id),KEY='bens-toolbox-pitches-v1';
let outing={pitcher:'',opponent:'',date:localDate(),inning:1,events:[]},storageReady=true;
try{const raw=localStorage.getItem(KEY);if(raw){const loaded=readOuting(JSON.parse(raw));if(loaded)outing=loaded;else storageReady=false;}}catch{storageReady=false;}
function storageNote(){$('storageStatus').textContent=storageReady?'This outing saves in this browser.':'Browser storage is unavailable. Export a CSV to keep this outing.';}
function save(){try{localStorage.setItem(KEY,JSON.stringify(outing));storageReady=true;}catch{storageReady=false;}storageNote();}
function message(text){$('status').textContent=text;}
function renderFields(){for(const [id,key] of [['pitcher','pitcher'],['opponent','opponent'],['gameDate','date'],['inning','inning']])$(id).value=outing[key];}
function render(){
 const all=stats(outing.events),current=stats(outing.events.filter(e=>e.inning===outing.inning));$('total').textContent=all.total;$('percentage').textContent=all.percentage;$('inningLabel').textContent='Inning '+outing.inning;$('inningTotal').textContent=current.total;$('undo').disabled=!all.total;$('export').disabled=!all.total;$('nextInning').disabled=outing.inning>=99;
 const counts=document.createDocumentFragment();for(const [key,label] of Object.entries(TYPES)){const row=document.createElement('div');row.className='breakdown-row';const text=document.createElement('span'),n=document.createElement('strong');text.textContent=label;n.textContent=outing.events.filter(e=>e.type===key).length;row.append(text,n);counts.append(row);}$('breakdown').replaceChildren(counts);
 const rows=document.createDocumentFragment();for(const inning of byInning(outing.events)){const row=document.createElement('tr');for(const value of [inning.inning,inning.total,inning.strikes,inning.percentage]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}rows.append(row);}$('inningRows').replaceChildren(rows);$('emptyInnings').hidden=!!all.total;
 const innings=byInning(outing.events),max=Math.max(1,...innings.map(i=>i.total)),bars=document.createDocumentFragment();
 for(const inning of innings){
  const row=document.createElement('div');row.className='inning-bar-row';const label=document.createElement('span');label.textContent='Inning '+inning.inning;
  const bar=document.createElement('div');bar.className='inning-bar';bar.setAttribute('aria-hidden','true');
  const strikes=document.createElement('span'),balls=document.createElement('span');strikes.className='bar-strikes';balls.className='bar-balls';strikes.style.width=(inning.strikes/max*100)+'%';balls.style.width=((inning.total-inning.strikes)/max*100)+'%';bar.append(strikes,balls);
  const total=document.createElement('span');total.textContent=inning.total;total.setAttribute('aria-label',`${inning.total} pitches: ${inning.strikes} strikes and ${inning.total-inning.strikes} balls`);row.title=total.getAttribute('aria-label');row.append(label,bar,total);bars.append(row);
 }
 $('inningBars').replaceChildren(bars);$('inningComparison').hidden=!all.total;
 const history=document.createDocumentFragment();for(let i=outing.events.length-1;i>=0;i--){const pitch=outing.events[i],item=document.createElement('li'),number=document.createElement('span'),label=document.createElement('span'),inning=document.createElement('small'),time=document.createElement('time');number.className='pitch-number';number.textContent='#'+(i+1);label.textContent=TYPES[pitch.type];inning.textContent='Inning '+pitch.inning;label.append(inning);time.dateTime=new Date(pitch.at).toISOString();time.textContent=new Date(pitch.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});item.append(number,label,time);history.append(item);}$('history').replaceChildren(history);$('emptyHistory').hidden=!!all.total;
}
for(const [id,key] of [['pitcher','pitcher'],['opponent','opponent'],['gameDate','date']])$(id).addEventListener('input',()=>{outing[key]=$(id).value;save();});
$('inning').addEventListener('change',()=>{const inning=Number($('inning').value);if(!Number.isInteger(inning)||inning<1||inning>99){message('Choose an inning from 1 to 99.');return;}outing.inning=inning;save();render();message('Now logging inning '+inning+'.');});
$('pitchButtons').addEventListener('click',event=>{const button=event.target.closest('[data-pitch]');if(!button)return;const inning=Number($('inning').value);if(!Number.isInteger(inning)||inning<1||inning>99){message('Choose an inning from 1 to 99 before logging a pitch.');$('inning').focus();return;}outing.inning=inning;outing.events.push({type:button.dataset.pitch,inning,at:Date.now()});save();render();message(`Pitch ${outing.events.length}: ${TYPES[button.dataset.pitch].toLowerCase()}, inning ${inning}.`);});
$('pitchButtons').addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.repeat||event.isComposing||event.altKey||event.ctrlKey||event.metaKey)return;
  const typing='input,textarea,select,[contenteditable],[role="textbox"]';
  if(event.target instanceof Element&&event.target.closest(typing)||document.activeElement?.closest(typing))return;
  const type={b:'ball',c:'called',s:'swinging',f:'foul',p:'inplay'}[event.key.toLowerCase()];
  if(!type)return;event.preventDefault();$('pitchButtons').querySelector(`[data-pitch="${type}"]`).click();
});
$('undo').addEventListener('click',()=>{const last=outing.events.pop();if(!last)return;save();render();message(`Removed ${TYPES[last.type].toLowerCase()} from inning ${last.inning}.`);});
$('nextInning').addEventListener('click',()=>{if(outing.inning>=99)return;outing.inning++;$('inning').value=outing.inning;save();render();message('Now logging inning '+outing.inning+'.');});
$('newOuting').addEventListener('click',()=>{if(!confirm('Start a new outing? This clears the current pitch log and opponent. Export a CSV first if you need a copy.'))return;outing={pitcher:outing.pitcher,opponent:'',date:localDate(),inning:1,events:[]};save();renderFields();render();message('New outing ready.');});
$('export').addEventListener('click',()=>{const blob=new Blob([pitchCSV(outing)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`pitch-log-${outing.date||localDate()}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Outing exported. Labels that could be spreadsheet formulas are prefixed with an apostrophe.');});
renderFields();render();storageNote();
