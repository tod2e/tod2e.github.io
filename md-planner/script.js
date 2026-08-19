(() => {
const $=id=>document.getElementById(id);
let generated={};
const NA=6.02214076e23;
function fmt(n,d=5){if(!Number.isFinite(n))return"—";if(n===0)return"0";if(Math.abs(n)>=1e7||Math.abs(n)<1e-4)return n.toExponential(3);return +n.toFixed(d)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function modeLabel(m){return({standard:"Standard MD",hmr:"HMR MD",steered:"Steered MD",umbrella:"Umbrella",meta:"Metadynamics"})[m]}
function psSteps(ps,dtfs){return Math.max(1,Math.round(ps/(dtfs/1000)))}
function nsSteps(ns,dtfs){return Math.max(1,Math.round(ns*1000/(dtfs/1000)))}
function nstFromPs(ps,dtfs){return Math.max(1,Math.round(ps/(dtfs/1000)))}
function showModes(){
 let m=$("mdMode").value;$("steeredSettings").classList.toggle("hidden",m!=="steered");$("umbrellaSettings").classList.toggle("hidden",m!=="umbrella");$("metaSettings").classList.toggle("hidden",m!=="meta");
 if(m==="hmr"){if(+$("dt").value<3)$("dt").value=4;$("constraints").value="all-bonds";$("modeNotice").className="notice warn";$("modeNotice").textContent="HMR mode assumes the topology has already undergone hydrogen-mass repartitioning. This tool changes appropriate integration/constraint settings but does not alter topology masses."}
 else if(m==="meta"){$("modeNotice").className="notice warn";$("modeNotice").textContent="Metadynamics generates plumed.dat in addition to GROMACS MDP files. The CV definition and metadynamics parameters require scientific validation for your free-energy problem."}
 else if(m==="umbrella"){$("modeNotice").className="notice warn";$("modeNotice").textContent="Umbrella mode generates one equilibration and one production MDP per window. You must still provide a starting structure near each window centre."}
 else{$("modeNotice").className="notice good";$("modeNotice").textContent="The generated files are explicit starting templates: inspect grompp warnings and force-field-specific recommendations before production."}
 calcPlan()
}
$("mdMode").onchange=showModes;
$("metaCv").onchange=()=>{$("atomCv").classList.toggle("hidden",$("metaCv").value!=="atomdist");$("comCv").classList.toggle("hidden",$("metaCv").value!=="comdist")};

function windowPositions(){
 let a=+$("umbStart").value,b=+$("umbEnd").value,s=Math.abs(+$("umbSpacing").value);if(!(s>0))return[];
 let dir=b>=a?1:-1,n=Math.floor(Math.abs(b-a)/s+1e-9)+1,arr=[];for(let i=0;i<n;i++)arr.push(a+dir*i*s);
 if(arr.length&&Math.abs(arr[arr.length-1]-b)>1e-7)arr.push(b);return arr
}
function boxEdgeFromConc(){
 let N=+$("boxN").value,C=+$("boxConc").value*1e-6;if(!(N>0&&C>0))return NaN;let liters=N/(C*NA),nm3=liters*1e24;return Math.cbrt(nm3)
}
function concFromEdge(edge){
 let N=+$("boxN").value;if(!(N>0&&edge>0))return NaN;let liters=edge**3/1e24;return N/(NA*liters)*1e6
}
let boxLock=false;
$("boxConc").oninput=()=>{if(boxLock)return;boxLock=true;let e=boxEdgeFromConc();$("boxEdge").value=Number.isFinite(e)?fmt(e,6):"";boxLock=false;calcPlan()};
$("boxEdge").oninput=()=>{if(boxLock)return;boxLock=true;let c=concFromEdge(+$("boxEdge").value);$("boxConc").value=Number.isFinite(c)?fmt(c,6):"";boxLock=false;calcPlan()};

function calcPlan(){
 let m=$("mdMode").value,dt=+$("dt").value,runtime=+$("runtime").value,steps=nsSteps(runtime,dt),save=+$("savePs").value,frames=Math.floor(runtime*1000/save)+1;
 let wins=m==="umbrella"?windowPositions().length:0,agg=m==="umbrella"?wins*(+$("umbNs").value):runtime,edge=+$("boxEdge").value||boxEdgeFromConc(),atoms=+$("atomCount").value,rawFrames=m==="umbrella"?frames*Math.max(1,wins):frames,raw=atoms>0?atoms*3*4*rawFrames/1e9:NaN;
 $("statSteps").textContent=steps.toLocaleString();$("statFrames").textContent=Number.isFinite(frames)?frames.toLocaleString():"—";$("statWindows").textContent=m==="umbrella"?wins:"—";$("statAggregate").textContent=`${fmt(agg,4)} ns`;$("statBox").textContent=Number.isFinite(edge)?`${fmt(edge,5)} nm`:"— nm";$("statRaw").textContent=Number.isFinite(raw)?`${fmt(raw,4)} GB`:"— GB";$("statMode").textContent=modeLabel(m)
}
document.querySelectorAll("input,select").forEach(el=>{if(!["boxConc","boxEdge","mdMode","metaCv"].includes(el.id))el.addEventListener("input",calcPlan)});

function nonbonded(){
 if($("ffPreset").value==="charmm")return `cutoff-scheme             = Verlet
coulombtype               = PME
rcoulomb                  = 1.2
vdwtype                   = Cut-off
vdw-modifier              = Force-switch
rvdw-switch               = 1.0
rvdw                      = 1.2
DispCorr                   = no`;
 return `cutoff-scheme             = Verlet
coulombtype               = PME
rcoulomb                  = 1.0
vdwtype                   = Cut-off
rvdw                      = 1.0
DispCorr                   = EnerPres`;
}
function common(dt,continuation="yes"){
 return `dt                        = ${fmt(dt/1000,6)}
continuation              = ${continuation}
constraints               = ${$("constraints").value}
constraint-algorithm      = lincs
lincs-order               = ${Math.max(2,Math.round(+$("lincsOrder").value||4))}
${nonbonded()}`;
}
function tc(){
 let T=+$("temp").value,g=$("tcGroups").value.trim()||"System",n=g.split(/\s+/).length,refs=Array(n).fill(fmt(T,3)).join(" "),taus=Array(n).fill($("thermostat").value==="nose-hoover"?"1.0":"0.5").join(" ");
 return `tcoupl                    = ${$("thermostat").value}
tc-grps                    = ${g}
tau-t                      = ${taus}
ref-t                      = ${refs}`;
}
function pc(kind=null){
 let p=+$("pressure").value,b=kind||$("barostat").value;if($("ensemble").value==="nvt"&&!kind)return"pcoupl                    = no";
 return `pcoupl                    = ${b}
pcoupltype                 = isotropic
tau-p                      = ${b==="Parrinello-Rahman"?"5.0":"2.0"}
ref-p                      = ${fmt(p,3)}
compressibility            = 4.5e-5`;
}
function emMdp(){return`; Energy minimisation — generated by MD Planner
integrator                 = steep
emtol                      = 1000
emstep                     = 0.01
nsteps                     = 50000
${nonbonded()}
pbc                        = xyz
`}
function nvtMdp(){
 let dt=+$("dt").value,steps=psSteps(+$("nvtPs").value,dt),T=+$("temp").value,g=$("tcGroups").value.trim()||"System",n=g.split(/\s+/).length;
 return`; NVT equilibration — generated by MD Planner
define                     = -DPOSRES
integrator                 = md
nsteps                     = ${steps}
${common(dt,"no")}
${tc()}
pcoupl                     = no
gen-vel                    = yes
gen-temp                   = ${fmt(T,3)}
gen-seed                   = -1
nstxout-compressed         = ${nstFromPs(10,dt)}
nstenergy                  = ${nstFromPs(2,dt)}
nstlog                     = ${nstFromPs(2,dt)}
pbc                        = xyz
`}
function nptMdp(){
 let dt=+$("dt").value,steps=psSteps(+$("nptPs").value,dt);
 return`; NPT equilibration — generated by MD Planner
define                     = -DPOSRES
integrator                 = md
nsteps                     = ${steps}
${common(dt,"yes")}
${tc()}
${pc("C-rescale")}
gen-vel                    = no
nstxout-compressed         = ${nstFromPs(10,dt)}
nstenergy                  = ${nstFromPs(2,dt)}
nstlog                     = ${nstFromPs(2,dt)}
pbc                        = xyz
`}
function productionBase(ns=null){
 let dt=+$("dt").value,runtime=ns??+$("runtime").value,steps=nsSteps(runtime,dt),save=nstFromPs(+$("savePs").value,dt);
 return`; Production MD — generated by MD Planner
integrator                 = md
nsteps                     = ${steps}
${common(dt,"yes")}
${tc()}
${pc()}
gen-vel                    = no
nstxout                    = 0
nstvout                    = 0
nstfout                    = 0
nstxout-compressed         = ${save}
nstenergy                  = ${nstFromPs(10,dt)}
nstlog                     = ${nstFromPs(10,dt)}
pbc                        = xyz
`;
}
function pullBlock(type,group1,group2,geom,k,rate,start,vec,init=null){
 let v=(geom.startsWith("direction"))?`\npull-coord1-vec           = ${vec}`:"";
 let initLine=init===null?"":`\npull-coord1-init          = ${fmt(init,6)}`;
 return `pull                      = yes
pull-ngroups               = 2
pull-ncoords               = 1
pull-group1-name           = ${group1}
pull-group2-name           = ${group2}
pull-coord1-type           = ${type}
pull-coord1-geometry       = ${geom}
pull-coord1-groups         = 1 2
pull-coord1-dim            = Y Y Y
pull-coord1-start          = ${start}
pull-coord1-rate           = ${fmt(rate,7)}
pull-coord1-k              = ${fmt(k,3)}${initLine}${v}
pull-nstxout               = 50
pull-nstfout               = 50`;
}
function metaPlumed(){
 let cv=$("metaCv").value,lines=[];
 if(cv==="atomdist")lines.push(`cv: DISTANCE ATOMS=${Math.round(+$("metaAtom1").value)},${Math.round(+$("metaAtom2").value)}`);
 else{lines.push(`ga: COM ATOMS=${$("metaGroupA").value.trim()}`);lines.push(`gb: COM ATOMS=${$("metaGroupB").value.trim()}`);lines.push("cv: DISTANCE ATOMS=ga,gb")}
 let grid="";if($("metaGridMin").value!==""&&$("metaGridMax").value!=="")grid=` GRID_MIN=${$("metaGridMin").value} GRID_MAX=${$("metaGridMax").value}`;
 lines.push(`metad: METAD ARG=cv SIGMA=${$("metaSigma").value} HEIGHT=${$("metaHeight").value} PACE=${Math.round(+$("metaPace").value)} BIASFACTOR=${$("metaBias").value} TEMP=${$("temp").value} FILE=HILLS${grid}`);
 lines.push(`PRINT ARG=cv,metad.bias STRIDE=${Math.round(+$("metaPrint").value)} FILE=COLVAR`);
 return lines.join("\n")+"\n"
}
function readme(m){
 let txt=`MD Planner generated protocol
=============================

Protocol: ${modeLabel(m)}
Temperature: ${$("temp").value} K
Pressure: ${$("pressure").value} bar
Timestep: ${$("dt").value} fs
Production runtime: ${$("runtime").value} ns
Nonbonded preset: ${$("ffPreset").value}

VALIDATION REQUIRED
-------------------
These are starting templates, not a substitute for force-field documentation or gmx grompp validation.
Check index-group names, cutoffs, thermostat/barostat choices, restraint defines, water model, ion settings,
membrane coupling, virtual sites and any special topology requirements before production.

`;
 if(m==="hmr")txt+=`HMR NOTE
--------
The MDP file does NOT repartition hydrogen masses. Prepare an HMR topology using the workflow appropriate
to your force field, then validate the chosen ${$("dt").value} fs timestep and constraints.

`;
 if(m==="umbrella")txt+=`UMBRELLA NOTE
-------------
Window MDPs define restraint centres, but every window still needs a starting configuration close to its centre.
A common workflow is to extract configurations from a steered/pulling trajectory, then equilibrate each window.
Use pullx/pullf output with your preferred PMF analysis workflow (e.g. WHAM) after adequate convergence checks.

`;
 if(m==="meta")txt+=`METADYNAMICS NOTE
------------------
Run production with: gmx mdrun -deffnm md -plumed plumed.dat
Validate the CV, sigma, hill height, pace, bias factor, boundary handling and convergence strategy.
The generated PLUMED file is a transparent starting template.

`;
 return txt
}
function runScript(m){
 let prod=m==="steered"?"pull": "md";
 let extra=m==="meta"?" -plumed plumed.dat":"";
 return `#!/usr/bin/env bash
set -euo pipefail

gmx grompp -f em.mdp  -c conf.gro -p topol.top -o em.tpr
gmx mdrun -deffnm em

gmx grompp -f nvt.mdp -c em.gro -r em.gro -p topol.top -o nvt.tpr
gmx mdrun -deffnm nvt

gmx grompp -f npt.mdp -c nvt.gro -r nvt.gro -t nvt.cpt -p topol.top -o npt.tpr
gmx mdrun -deffnm npt

gmx grompp -f ${prod}.mdp -c npt.gro -t npt.cpt -p topol.top -n index.ndx -o ${prod}.tpr
gmx mdrun -deffnm ${prod}${extra}
`
}
function generateFiles(){
 let m=$("mdMode").value;generated={"em.mdp":emMdp(),"nvt.mdp":nvtMdp(),"npt.mdp":nptMdp(),"README.txt":readme(m)};
 if(m==="standard"||m==="hmr"){generated["md.mdp"]=productionBase();generated["run.sh"]=runScript(m)}
 if(m==="steered"){generated["pull.mdp"]=productionBase()+`\n${pullBlock("umbrella",$("pullG1").value,$("pullG2").value,$("pullGeom").value,+$("pullK").value,+$("pullRate").value,$("pullStart").value,$("pullVec").value)}\n`;generated["run.sh"]=runScript(m)}
 if(m==="meta"){generated["md.mdp"]=productionBase();generated["plumed.dat"]=metaPlumed();generated["run.sh"]=runScript(m)}
 if(m==="umbrella"){
   let arr=windowPositions(),dt=+$("dt").value,g1=$("umbG1").value,g2=$("umbG2").value,geom=$("umbGeom").value,k=+$("umbK").value,vec=$("umbVec").value,eqps=+$("umbEqPs").value,ns=+$("umbNs").value;
   generated["windows.csv"]="index,center_nm\n"+arr.map((x,i)=>`${String(i).padStart(3,"0")},${x}`).join("\n");
   arr.forEach((center,i)=>{
     let dir=`windows/window_${String(i).padStart(3,"0")}/`,block=pullBlock("umbrella",g1,g2,geom,k,0,"no",vec,center);
     let eq=`; Umbrella window equilibration at ${fmt(center,5)} nm
integrator                 = md
nsteps                     = ${psSteps(eqps,dt)}
${common(dt,"yes")}
${tc()}
${pc()}
gen-vel                    = no
nstxout-compressed         = ${nstFromPs(10,dt)}
nstenergy                  = ${nstFromPs(5,dt)}
nstlog                     = ${nstFromPs(5,dt)}
pbc                        = xyz
${block}
`;
     let prod=productionBase(ns)+`\n${block}\n`;
     generated[dir+"equil.mdp"]=eq;generated[dir+"prod.mdp"]=prod;
   });
   generated["run_umbrella.sh"]=`#!/usr/bin/env bash
set -euo pipefail
# Place a starting conf.gro close to each restraint centre in every windows/window_XXX/ directory.
for d in windows/window_*; do
  gmx grompp -f "$d/equil.mdp" -c "$d/conf.gro" -p topol.top -n index.ndx -o "$d/equil.tpr"
  gmx mdrun -deffnm "$d/equil"
  gmx grompp -f "$d/prod.mdp" -c "$d/equil.gro" -t "$d/equil.cpt" -p topol.top -n index.ndx -o "$d/prod.tpr"
  gmx mdrun -deffnm "$d/prod"
done
`;
 }
 renderFiles();$("downloadZip").disabled=false;$("statFiles").textContent=Object.keys(generated).length;calcPlan()
}
$("generate").onclick=generateFiles;
function renderFiles(){
 let names=Object.keys(generated);$("fileList").innerHTML=names.slice(0,120).map((n,i)=>`<button class="fileitem" data-file="${esc(n)}"><code>${esc(n)}</code><span class="mini">preview</span></button>`).join("")+(names.length>120?`<div class="notice">${names.length-120} additional files are included in the ZIP.</div>`:"");
 document.querySelectorAll("[data-file]").forEach(b=>b.onclick=()=>previewFile(b.dataset.file));if(names[0])previewFile(names[0])
}
function previewFile(name){$("previewName").textContent=name;$("preview").textContent=generated[name]}

// Minimal uncompressed ZIP writer (store method), dependency-free.
function crc32(bytes){let table=crc32.table||(crc32.table=(()=>{let t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})()),c=0xFFFFFFFF;for(let b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function u16(n){return[n&255,(n>>>8)&255]}function u32(n){return[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]}
function makeZip(files){
 let enc=new TextEncoder(),parts=[],central=[],offset=0,count=0;
 for(let [name,text] of Object.entries(files)){let nb=enc.encode(name),data=enc.encode(text),crc=crc32(data),local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...nb]);parts.push(local,data);let cen=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...nb]);central.push(cen);offset+=local.length+data.length;count++}
 let centralSize=central.reduce((a,b)=>a+b.length,0),end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(count),...u16(count),...u32(centralSize),...u32(offset),...u16(0)]);return new Blob([...parts,...central,end],{type:"application/zip"})
}
$("downloadZip").onclick=()=>{let blob=makeZip(generated),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`md-planner-${$("mdMode").value}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)};
$("mdNotesBtn").onclick=()=>$("mdNotes").showModal();$("mdNotes").querySelector(".close").onclick=()=>$("mdNotes").close();

$("boxConc").dispatchEvent(new Event("input"));showModes();$("metaCv").dispatchEvent(new Event("change"));
})();