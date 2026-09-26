export const TYPES = {ball:'Ball',called:'Called strike',swinging:'Swinging strike',foul:'Foul',inplay:'In play'};
export function localDate(date=new Date()) {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function stats(events) {const total=events.length,strikes=events.filter(e=>e.type!=='ball').length;return {total,strikes,percentage:total?(strikes/total*100).toFixed(1)+'%':'—'};}
export function byInning(events) {const groups=new Map();for(const e of events){if(!groups.has(e.inning))groups.set(e.inning,[]);groups.get(e.inning).push(e);}return [...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([inning,pitches])=>({inning,...stats(pitches)}));}
export function csvCell(value) {let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function pitchCSV(outing) {return '\uFEFF'+[['Pitcher','Opponent','Game date','Pitch number','Inning','Pitch type','Counts as strike','Logged at (UTC)'],...outing.events.map((e,i)=>[outing.pitcher,outing.opponent,outing.date,i+1,e.inning,TYPES[e.type],e.type!=='ball'?'Yes':'No',new Date(e.at).toISOString()])].map(row=>row.map(csvCell).join(',')).join('\r\n');}
export function readOuting(raw) {
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.events))return null;
  return {pitcher:typeof raw.pitcher==='string'?raw.pitcher.slice(0,100):'',opponent:typeof raw.opponent==='string'?raw.opponent.slice(0,100):'',date:typeof raw.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.date)?raw.date:localDate(),inning:Number.isInteger(raw.inning)&&raw.inning>0&&raw.inning<100?raw.inning:1,events:raw.events.filter(e=>e&&Object.hasOwn(TYPES,e.type)&&Number.isInteger(e.inning)&&e.inning>0&&e.inning<100&&Number.isFinite(e.at)&&!isNaN(new Date(e.at).getTime())).map(e=>({type:e.type,inning:e.inning,at:e.at}))};
}
