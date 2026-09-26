export function durationMs(minutes, seconds) {
  const m=Number(minutes),s=Number(seconds);
  return Number.isInteger(m)&&Number.isInteger(s)&&m>=0&&m<=999&&s>=0&&s<=59&&(m||s)?(m*60+s)*1000:null;
}
export function remaining(timer, now=Date.now()) { return timer.phase==='running'?Math.max(0,timer.deadline-now):Math.max(0,timer.remainingMs); }
export function advance(timer, now=Date.now()) {
  if(timer.phase==='running'&&remaining(timer,now)===0) return {...timer,phase:'finished',remainingMs:0,deadline:null};
  return timer;
}
export function start(timer, now=Date.now()) {
  const ms=timer.phase==='finished'?timer.durationMs:timer.remainingMs;
  return {...timer,phase:'running',remainingMs:ms,deadline:now+ms};
}
export function pause(timer, now=Date.now()) {
  const ms=remaining(timer,now);
  return {...timer,phase:ms?'paused':'finished',remainingMs:ms,deadline:null};
}
export function reset(timer) { return {...timer,phase:'idle',remainingMs:timer.durationMs,deadline:null}; }
export function clock(ms) {
  const seconds=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;
  return (h?h+':'+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+':'+String(s).padStart(2,'0');
}
export function readTimers(raw) {
  if(!Array.isArray(raw)) return null;
  const seen=new Set();
  return raw.filter(t=>t&&typeof t.id==='string'&&!seen.has(t.id)&&seen.add(t.id)&&typeof t.name==='string'&&Number.isFinite(t.durationMs)&&t.durationMs>0&&t.durationMs<=59999000&&Number.isFinite(t.remainingMs)&&t.remainingMs>=0&&['idle','running','paused','finished'].includes(t.phase)&&(t.phase!=='running'||Number.isFinite(t.deadline))).map(t=>({...t,name:t.name.slice(0,80)}));
}
