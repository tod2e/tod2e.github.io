export const ROWS = 'ABCDEFGH';
export const COLORS = ['#f39876','#88b6a4','#8aafd1','#c9ade0','#d4c077','#b8b9b0'];
export function blankWells() { return Array.from({length:96}, () => ({sample:'',condition:'',color:COLORS[0]})); }
export function wellName(index) { return ROWS[Math.floor(index / 12)] + (index % 12 + 1); }
export function rectangle(a, b) {
  const result = [];
  for(let r=Math.min(Math.floor(a/12),Math.floor(b/12));r<=Math.max(Math.floor(a/12),Math.floor(b/12));r++)
    for(let c=Math.min(a%12,b%12);c<=Math.max(a%12,b%12);c++) result.push(r*12+c);
  return result;
}
export function csvCell(value) {
  // A leading apostrophe prevents spreadsheet formulas in user-supplied labels.
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"','""') + '"';
}
export function plateCSV(plate) {
  return '\uFEFF' + [['Plate','Well','Row','Column','Sample','Condition','Color'],...plate.wells.map((w,i) => [plate.name,wellName(i),ROWS[Math.floor(i/12)],i%12+1,w.sample,w.condition,w.color])].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export function readPlate(raw) {
  if(!raw || typeof raw!=='object' || !Array.isArray(raw.wells) || raw.wells.length!==96) return null;
  return {name:typeof raw.name==='string'?raw.name.slice(0,120):'',wells:raw.wells.map(w=>({sample:typeof w?.sample==='string'?w.sample.slice(0,160):'',condition:typeof w?.condition==='string'?w.condition.slice(0,160):'',color:COLORS.includes(w?.color)?w.color:COLORS[0]}))};
}
