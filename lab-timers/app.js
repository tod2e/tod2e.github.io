import {durationMs,remaining,advance,start,pause,reset,clock,readTimers} from './model.mjs';
const $=id=>document.getElementById(id),KEY='bens-toolbox-timers-v1';
let timers=[],storageReady=true,audioContext=null,soundEnabled=false;
try {const raw=localStorage.getItem(KEY);if(raw){const loaded=readTimers(JSON.parse(raw));if(loaded)timers=loaded;else storageReady=false;}}catch{storageReady=false;}
function storageNote(){$('storageStatus').textContent=storageReady?'Timers save in this browser.':'Browser storage is unavailable. Keep this tab open to retain your timers.';}
function save(){try{localStorage.setItem(KEY,JSON.stringify(timers));storageReady=true;}catch{storageReady=false;}storageNote();}
function announce(names){if(names.length)$('announcements').textContent=names.join(', ')+(names.length===1?' is finished.':' are finished.');}
function beep(){if(!soundEnabled||!audioContext||audioContext.state!=='running')return;try{for(let i=0;i<3;i++){const tone=audioContext.createOscillator(),volume=audioContext.createGain(),at=audioContext.currentTime+i*.35;tone.frequency.value=i===1?660:880;volume.gain.setValueAtTime(0,at);volume.gain.linearRampToValueAtTime(.16,at+.025);volume.gain.exponentialRampToValueAtTime(.001,at+.24);tone.connect(volume);volume.connect(audioContext.destination);tone.start(at);tone.stop(at+.25);}}catch{/* Visual completion remains available. */}}
$('sound').addEventListener('change',async()=>{soundEnabled=$('sound').checked;if(!soundEnabled)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Audio unavailable');audioContext ||= new Audio();await audioContext.resume();if(audioContext.state!=='running')throw new Error('Audio suspended');$('formStatus').textContent='Sound enabled for this visit.';beep();}catch{soundEnabled=false;$('sound').checked=false;$('formStatus').textContent='Sound is unavailable in this browser. Timers will still show when they finish.';}});
function button(text,className,action,id){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=className;b.dataset.action=action;b.dataset.timer=id;return b;}
function render(){
  const fragment=document.createDocumentFragment();
  for(const t of timers){
    const card=document.createElement('article');card.className='panel timer-card';card.dataset.id=t.id;card.dataset.phase=t.phase;
    const top=document.createElement('div');top.className='timer-top';const name=document.createElement('h3');name.textContent=t.name;const phase=document.createElement('span');phase.className='timer-phase';top.append(name,phase);
    const readout=document.createElement('div');readout.className='timer-clock';readout.setAttribute('role','timer');readout.setAttribute('aria-label',t.name+' time remaining');readout.setAttribute('aria-live','off');const meta=document.createElement('div');meta.className='timer-meta';
    const actions=document.createElement('div');actions.className='actions';actions.append(button('Start','primary','toggle',t.id),button('Reset','secondary','reset',t.id),button('Remove','secondary remove','remove',t.id));card.append(top,readout,meta,actions);fragment.append(card);
  }
  $('timers').replaceChildren(fragment);$('empty').hidden=!!timers.length;$('timerCount').textContent=`${timers.length} timer${timers.length===1?'':'s'}`;updateReadouts();
}
function updateReadouts(){
  const now=Date.now();
  for(const t of timers){const card=[...$('timers').children].find(el=>el.dataset.id===t.id);if(!card)continue;
    const value=clock(remaining(t,now));if(card.querySelector('.timer-clock').textContent!==value)card.querySelector('.timer-clock').textContent=value;
    card.dataset.phase=t.phase;card.querySelector('.timer-phase').textContent={idle:'Ready',running:'Running',paused:'Paused',finished:'Finished'}[t.phase];
    card.querySelector('[data-action=toggle]').textContent={idle:'Start',running:'Pause',paused:'Resume',finished:'Start again'}[t.phase];
    card.querySelector('.timer-meta').textContent=t.phase==='running'?'Finishes at '+new Date(t.deadline).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):t.phase==='finished'?'Time is up.':'Duration '+clock(t.durationMs);
  }
  const count=timers.filter(t=>t.phase==='finished').length;document.title=count?`${count} finished · Lab Timers`:'Lab Timers · Ben\'s Games & Tools';
}
function tick(){const finished=[];timers=timers.map(t=>{const next=advance(t);if(next!==t)finished.push(t.name);return next;});if(finished.length){save();announce(finished);beep();}updateReadouts();}
function addTimer(duration,name) {
  const id=globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  timers.push({id,name,durationMs:duration,remainingMs:duration,phase:'idle',deadline:null});save();render();
  $('formStatus').textContent=`Added ${name}. Press Start when ready.`;
}
$('timerForm').addEventListener('submit',event=>{event.preventDefault();const duration=durationMs($('minutes').value,$('seconds').value);if(!duration){$('formStatus').textContent='Choose a duration above zero, with 0–59 seconds.';return;}addTimer(duration,$('timerName').value.trim()||`Timer ${timers.length+1}`);$('timerName').value='';});
for(const preset of document.querySelectorAll('[data-preset]'))preset.addEventListener('click',()=>{
  const minutes=Number(preset.dataset.preset);if(![5,15,30,60].includes(minutes))return;
  addTimer(minutes*60000,$('timerName').value.trim()||`${minutes}-minute timer`);$('timerName').value='';
});
$('timers').addEventListener('click',event=>{const control=event.target.closest('button[data-action]');if(!control)return;const i=timers.findIndex(t=>t.id===control.dataset.timer);if(i<0)return;const t=timers[i],action=control.dataset.action;
  if(action==='remove'){if(t.phase==='running'&&!confirm(`Remove the running timer “${t.name}”?`))return;timers.splice(i,1);save();render();$('formStatus').textContent=`Removed ${t.name}.`;return;}
  if(action==='reset')timers[i]=reset(t);else if(action==='toggle')timers[i]=t.phase==='running'?pause(t):start(t);
  if(t.phase==='running'&&timers[i].phase==='finished'){announce([t.name]);beep();}
  save();updateReadouts();
});
render();storageNote();tick();setInterval(tick,250);document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
