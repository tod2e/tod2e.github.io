(() => {
const $=id=>document.getElementById(id);
const CUSTOM_KEY="biocalcCustomRecipes:v1";
let builtins=window.BIOCALC_RECIPES||[], custom=loadCustom(), selectedId=builtins[0]?.id||null, mixMode="target", mixCounter=0;
const volFactor={L:1e6,mL:1e3,"µL":1,nL:1e-3}; // to µL
const molarFactor={M:1,mM:1e-3,"µM":1e-6,nM:1e-9,pM:1e-12};
const massFactor={"g/L":1,"mg/mL":1,"mg/L":1e-3,"µg/mL":1e-3}; // to g/L
const concUnits=["M","mM","µM","nM","pM","mg/mL","g/L","mg/L","µg/mL"];
const residueMass={A:71.0788,R:156.1875,N:114.1038,D:115.0886,C:103.1388,E:129.1155,Q:128.1307,G:57.0519,H:137.1411,I:113.1594,L:113.1594,K:128.1741,M:131.1926,F:147.1766,P:97.1167,S:87.0782,T:101.1051,W:186.2132,Y:163.1760,V:99.1326};

function loadCustom(){try{return JSON.parse(localStorage.getItem(CUSTOM_KEY)||"[]")}catch{return[]}}
function saveCustom(){localStorage.setItem(CUSTOM_KEY,JSON.stringify(custom))}
function allRecipes(){return [...builtins,...custom]}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function fmt(n,d=4){if(!Number.isFinite(n))return"—";if(n===0)return"0";if(Math.abs(n)>=10000||Math.abs(n)<0.001)return n.toExponential(3);return +n.toFixed(d)}
function download(name,text,type="text/plain"){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function tab(name){document.querySelectorAll(".tabview").forEach(x=>x.classList.add("hidden"));$("tab-"+name).classList.remove("hidden");document.querySelectorAll(".tabbtn").forEach(b=>b.classList.toggle("active",b.dataset.tab===name))}
document.querySelectorAll(".tabbtn").forEach(b=>b.onclick=()=>tab(b.dataset.tab));

function ml(value,unit){value=Number(value);return unit==="L"?value*1000:unit==="µL"?value/1000:value}
function scaleAmount(amount,unit,factor){return {value:amount*factor,unit}}
function renderRecipeList(){
 let q=$("recipeSearch").value.trim().toLowerCase();
 let recs=allRecipes().filter(r=>(r.name+" "+r.category+" "+(r.note||"")).toLowerCase().includes(q));
 $("recipeList").innerHTML=recs.map(r=>`<button class="recipe-card ${r.id===selectedId?"active":""}" data-recipe="${esc(r.id)}"><strong>${esc(r.name)}</strong><small>${esc(r.category)} · ${r.components.length} components</small></button>`).join("")||'<div class="notice">No matching recipes.</div>';
 document.querySelectorAll("[data-recipe]").forEach(b=>b.onclick=()=>{selectedId=b.dataset.recipe;renderRecipeList();renderRecipe()});
}
function renderRecipe(){
 let r=allRecipes().find(x=>x.id===selectedId);if(!r)return;
 let targetMl=ml($("recipeVolume").value,$("recipeVolumeUnit").value), factor=targetMl/r.baseVolumeMl;
 $("recipeName").textContent=r.name;$("recipeCategory").textContent=r.category;$("recipeNote").textContent=r.note||"";
 $("recipeSubrecipe").classList.toggle("hidden",!r.subrecipe);$("recipeSubrecipe").textContent=r.subrecipe||"";
 $("recipeTable").innerHTML=r.components.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${fmt(c.amount*factor,5)} ${esc(c.unit)}</td><td class="muted">${esc(c.detail||"")}</td></tr>`).join("");
 $("recipeInstructions").innerHTML=(r.instructions||[]).map(x=>`<li>${esc(x)}</li>`).join("");
}
$("recipeSearch").oninput=renderRecipeList;$("recipeVolume").oninput=renderRecipe;$("recipeVolumeUnit").onchange=renderRecipe;
$("addRecipeBtn").onclick=()=>{$("customRecipeStatus").textContent="";$("recipeModal").showModal()};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());
$("helpBtn").onclick=()=>$("helpModal").showModal();
$("saveCustomRecipe").onclick=()=>{
 let name=$("customRecipeName").value.trim(),base=Number($("customRecipeBase").value),baseMl=ml(base,$("customRecipeBaseUnit").value);
 let comps=$("customRecipeComponents").value.split(/\n/).map(l=>l.split("|").map(x=>x.trim())).filter(x=>x[0]&&Number(x[1])&&x[2]).map(x=>({name:x[0],amount:Number(x[1]),unit:x[2],detail:x[3]||""}));
 let inst=$("customRecipeInstructions").value.split(/\n/).map(x=>x.trim()).filter(Boolean);
 if(!name||!baseMl||!comps.length){$("customRecipeStatus").textContent="Give the recipe a name, base volume and at least one valid component.";return}
 let r={id:"custom-"+Date.now(),name,category:"Custom",baseVolumeMl:baseMl,note:"Custom recipe saved in this browser.",components:comps,instructions:inst};
 custom.push(r);saveCustom();selectedId=r.id;$("recipeModal").close();renderRecipeList();renderRecipe();
};
$("exportRecipes").onclick=()=>download("biocalc_custom_recipes.json",JSON.stringify(custom,null,2),"application/json");

function unitType(u){return u in molarFactor?"molar":u in massFactor?"mass":null}
function concBase(value,unit){
 value=Number(value);if(!Number.isFinite(value))return NaN;
 if(unitType(unit)==="molar")return value*molarFactor[unit];   // M
 if(unitType(unit)==="mass")return value*massFactor[unit];     // g/L
 return NaN
}
function convertConc(value,fromUnit,toUnit,mwKDa){
 let from=unitType(fromUnit),to=unitType(toUnit),base=concBase(value,fromUnit);
 if(!Number.isFinite(base))return NaN;
 if(from===to){
   return to==="molar"?base/molarFactor[toUnit]:base/massFactor[toUnit];
 }
 if(!(mwKDa>0))return NaN;
 let mw=mwKDa*1000; // g/mol
 if(from==="mass"&&to==="molar"){let M=base/mw;return M/molarFactor[toUnit]}
 if(from==="molar"&&to==="mass"){let gL=base*mw;return gL/massFactor[toUnit]}
 return NaN
}
function concRatio(stock,stockUnit,goal,goalUnit,mwKDa){
 let goalInStockUnits=convertConc(goal,goalUnit,stockUnit,mwKDa);
 return Number.isFinite(goalInStockUnits)&&stock>0?goalInStockUnits/stock:NaN
}
function finalFromVolume(stock,stockUnit,volumeUl,totalUl,outUnit,mwKDa){
 if(!(totalUl>0))return NaN;
 let stockInOut=convertConc(stock,stockUnit,outUnit,mwKDa);
 return Number.isFinite(stockInOut)?stockInOut*volumeUl/totalUl:NaN
}
function addMixRow(data={}){
 let id=++mixCounter,tr=document.createElement("tr");tr.dataset.id=id;
 let opts=concUnits.map(u=>`<option ${u===(data.stockUnit||"µM")?"selected":""}>${u}</option>`).join("");
 let outopts=concUnits.map(u=>`<option ${u===(data.finalUnit||"µM")?"selected":""}>${u}</option>`).join("");
 tr.innerHTML=`<td><input class="mx-name" value="${esc(data.name||"")} " placeholder="FapC"></td>
 <td><input class="mx-stock" type="number" step="any" value="${data.stock??""}"></td>
 <td><select class="mx-stockunit">${opts}</select></td>
 <td><input class="mx-mw" type="number" step="any" value="${data.mw??""}" placeholder="optional"></td>
 <td><input class="mx-goal" type="number" step="any" value="${data.goal??""}"></td>
 <td><select class="mx-goalunit">${outopts}</select></td>
 <td><input class="mx-volume" type="number" step="any" value="${data.volume??""}" placeholder="calculated"></td>
 <td><button class="mini mx-delete">×</button></td>`;
 $("mixRows").appendChild(tr);tr.querySelectorAll("input,select").forEach(x=>x.addEventListener("input",calcMix));tr.querySelector(".mx-delete").onclick=()=>{tr.remove();calcMix()};syncMixMode();calcMix()
}
function syncMixMode(){
 $("mixGoalHead").textContent=mixMode==="target"?"Wanted final":"Calculated final";
 $("mixVolHead").textContent=mixMode==="target"?"Volume to add (µL)":"Volume added (µL)";
 document.querySelectorAll("#mixRows tr").forEach(tr=>{
   let g=tr.querySelector(".mx-goal"),v=tr.querySelector(".mx-volume");
   g.readOnly=mixMode==="reverse";v.readOnly=mixMode==="target";
   g.placeholder=mixMode==="reverse"?"calculated":"wanted";v.placeholder=mixMode==="target"?"calculated":"enter";
 });
 document.querySelectorAll("[data-mixmode]").forEach(b=>b.classList.toggle("active",b.dataset.mixmode===mixMode));calcMix()
}
document.querySelectorAll("[data-mixmode]").forEach(b=>b.onclick=()=>{mixMode=b.dataset.mixmode;syncMixMode()});
$("addMixRow").onclick=()=>addMixRow();
$("mixTotalVolume").oninput=calcMix;$("mixTotalUnit").onchange=calcMix;
function calcMix(){
 let totalUl=Number($("mixTotalVolume").value)*(volFactor[$("mixTotalUnit").value]||1),sum=0,issues=[];
 let rows=[...document.querySelectorAll("#mixRows tr")];
 rows.forEach(tr=>{
   let stock=Number(tr.querySelector(".mx-stock").value),su=tr.querySelector(".mx-stockunit").value,mw=Number(tr.querySelector(".mx-mw").value),gu=tr.querySelector(".mx-goalunit").value;
   if(mixMode==="target"){
     let goal=Number(tr.querySelector(".mx-goal").value),ratio=concRatio(stock,su,goal,gu,mw);
     let v=(Number.isFinite(ratio)&&totalUl>0)?ratio*totalUl:NaN;
     tr.querySelector(".mx-volume").value=Number.isFinite(v)?fmt(v,6):"";
     if(Number.isFinite(v))sum+=v;
     if(unitType(su)!==unitType(gu)&&!(mw>0))issues.push(`${tr.querySelector(".mx-name").value||"A component"} needs MW for mass↔molar conversion.`);
     if(Number.isFinite(v)&&v<0)issues.push("Negative component volume detected.");
   }else{
     let v=Number(tr.querySelector(".mx-volume").value);if(Number.isFinite(v))sum+=v;
     let goal=(v>=0)?finalFromVolume(stock,su,v,totalUl,gu,mw):NaN;
     tr.querySelector(".mx-goal").value=Number.isFinite(goal)?fmt(goal,7):"";
     if(unitType(su)!==unitType(gu)&&!(mw>0))issues.push(`${tr.querySelector(".mx-name").value||"A component"} needs MW for mass↔molar conversion.`);
   }
 });
 let dil=totalUl-sum;
 $("mixComponentCount").textContent=rows.length;$("mixStockTotal").textContent=`${fmt(sum,4)} µL`;$("mixDiluent").textContent=totalUl>0?`${fmt(dil,4)} µL`:"—";$("mixFinalTotal").textContent=totalUl>0?`${fmt(totalUl,4)} µL`:"—";
 let w=$("mixWarning");
 if(totalUl<=0){w.className="notice bad";w.textContent="Enter a positive final volume."}
 else if(dil< -1e-9){w.className="notice bad";w.textContent=`Stock volumes exceed the final volume by ${fmt(-dil,4)} µL. Check stock concentrations or requested finals.`}
 else if(issues.length){w.className="notice warn";w.textContent=issues[0]}
 else{w.className="notice good";w.textContent=`Add ${fmt(Math.max(0,dil),4)} µL diluent after the listed stock volumes to reach the final volume.`}
}
function mixCSV(){
 let lines=["Component,Stock,Stock unit,MW kDa,Final concentration,Final unit,Volume uL"];
 document.querySelectorAll("#mixRows tr").forEach(tr=>lines.push([
   tr.querySelector(".mx-name").value,tr.querySelector(".mx-stock").value,tr.querySelector(".mx-stockunit").value,tr.querySelector(".mx-mw").value,tr.querySelector(".mx-goal").value,tr.querySelector(".mx-goalunit").value,tr.querySelector(".mx-volume").value
 ].map(x=>`"${String(x).replaceAll('"','""')}"`).join(",")));
 lines.push(`"Diluent","","","","","","${Math.max(0,Number($("mixDiluent").textContent.split(" ")[0])||0)}"`);return lines.join("\n")
}
$("downloadMix").onclick=()=>download("biocalc_mix.csv",mixCSV(),"text/csv");
$("copyMix").onclick=async()=>{let text=mixCSV().replaceAll(",","\t").replaceAll('"',"");try{await navigator.clipboard.writeText(text);$("copyMix").textContent="Copied";setTimeout(()=>$("copyMix").textContent="Copy recipe",1000)}catch{}};

function calcAbs(){
 let A=Number($("absA").value)-Number($("absBlank").value),l=Number($("absPath").value),d=Number($("absDilution").value),eps=Number($("absEpsilon").value),mw=Number($("absMw").value);
 let M=(l>0&&eps>0)?A/(eps*l)*(d||1):NaN,um=M*1e6,mgml=M*(mw*1000);
 $("absCorrected").textContent=fmt(A,5);$("absMolar").textContent=Number.isFinite(M)?`${fmt(M,6)} M`:"— M";$("absUM").textContent=Number.isFinite(um)?`${fmt(um,4)} µM`:"— µM";$("absMgMl").textContent=Number.isFinite(mgml)?`${fmt(mgml,5)} mg/mL`:"— mg/mL";
 let w=$("absWarn");if(A<0){w.className="notice bad";w.textContent="Blank-corrected absorbance is negative."}else if(!(eps>0&&l>0)){w.className="notice bad";w.textContent="Path length and extinction coefficient must be positive."}else{w.className="notice good";w.textContent="Concentration is corrected for the dilution factor entered above."}
}
["absA","absBlank","absPath","absDilution","absEpsilon","absMw"].forEach(id=>$(id).oninput=calcAbs);
function calcSeq(){
 let seq=$("seqInput").value.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g,""),n=seq.length,W=(seq.match(/W/g)||[]).length,Y=(seq.match(/Y/g)||[]).length,C=(seq.match(/C/g)||[]).length;
 let cystine=$("cysMode").value==="pairs"?Math.floor(C/2):0,eps=W*5500+Y*1490+cystine*125,mw=18.01528;
 for(let aa of seq)mw+=residueMass[aa]||0;
 $("seqN").textContent=n;$("seqCounts").textContent=`${W} / ${Y} / ${C}`;$("seqEpsilon").textContent=fmt(eps,1);$("seqMw").textContent=`${fmt(mw/1000,4)} kDa`;
 $("useSequence").dataset.eps=eps;$("useSequence").dataset.mw=mw/1000;
}
$("seqInput").oninput=calcSeq;$("cysMode").onchange=calcSeq;$("useSequence").onclick=()=>{$("absEpsilon").value=$("useSequence").dataset.eps||0;$("absMw").value=$("useSequence").dataset.mw||0;calcAbs()};

function quick(){
 let c1=Number($("qC1").value),c2=Number($("qC2").value),v2=Number($("qV2").value),v1=c1?c2*v2/c1:NaN;$("qV1").textContent=Number.isFinite(v1)?`${fmt(v1,5)} ${$("qVUnit").value}`:"—";
 let um=Number($("qUM").value),mw=Number($("qMW").value);$("qMass").textContent=`${fmt(um*mw/1000,5)} mg/mL`;
 let C=Number($("qMolConc").value)*1e-6,V=Number($("qMolVol").value)*1e-6,N=C*V*6.02214076e23;$("qMolecules").textContent=Number.isFinite(N)?N.toExponential(3):"—";
 let start=Number($("serialStart").value),fold=Number($("serialFold").value),steps=Math.max(1,Math.min(50,Math.floor(Number($("serialSteps").value)||1)));let vals=[];for(let i=0;i<steps;i++)vals.push(fmt(start/Math.pow(fold,i),6));$("serialOut").textContent=(fold>0?vals.join(" → "):"Fold dilution must be >0");
}
["qC1","qC2","qV2","qVUnit","qUM","qMW","qMolConc","qMolVol","serialStart","serialFold","serialSteps"].forEach(id=>$(id).addEventListener("input",quick));

renderRecipeList();renderRecipe();addMixRow({name:"Protein A",stock:500,stockUnit:"µM",mw:25,goal:50,finalUnit:"µM"});addMixRow({name:"Ligand",stock:10,stockUnit:"mM",goal:100,finalUnit:"µM"});calcAbs();calcSeq();quick();
})();