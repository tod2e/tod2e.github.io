(() => {
const $=id=>document.getElementById(id);
let cspRows=[],drRows=[];
function fmt(n,d=5){if(!Number.isFinite(n))return"—";if(n===0)return"0";if(Math.abs(n)>=1e5||Math.abs(n)<1e-4)return n.toExponential(3);return +n.toFixed(d)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function download(name,text){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/csv"}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function parseRows(text,n){return text.trim().split(/\n/).map(l=>l.trim()).filter(Boolean).map(l=>l.split(/[,\t;]/).map(x=>x.trim())).filter(r=>r.length>=n)}
function tab(name){document.querySelectorAll(".tabview").forEach(x=>x.classList.add("hidden"));$("tab-"+name).classList.remove("hidden");document.querySelectorAll(".tabbtn").forEach(b=>b.classList.toggle("active",b.dataset.tab===name))}
document.querySelectorAll(".tabbtn").forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$("notesBtn").onclick=()=>$("notesModal").showModal();$("notesModal").querySelector(".close").onclick=()=>$("notesModal").close();

function acq(){
 let mhz=+$("acqMHz").value,swppm=+$("acqSwPpm").value,n=+$("acqPoints").value,nf=+$("acqFinalPoints").value,sw=mhz*swppm;
 $("acqSwHz").textContent=`${fmt(sw,3)} Hz`;$("acqDwell").textContent=sw>0?`${fmt(1/sw*1e6,3)} µs`:"— µs";$("acqTime").textContent=sw>0?`${fmt(n/sw*1000,3)} ms`:"— ms";$("acqRes").textContent=nf>0?`${fmt(sw/nf,5)} Hz/pt`:"— Hz/pt";
 $("ppmHz").textContent=`${fmt(+$("ppmValue").value*+$("ppmMHz").value,5)} Hz`;$("hzPpm").textContent=`${fmt(+$("hzOffset").value/(+$("hzMHz").value||NaN),6)} ppm`;
 let p=+$("p90").value;$("b1").textContent=p>0?`${fmt(1/(4*p*1e-6)/1000,4)} kHz`:"— kHz";
}
["acqMHz","acqSwPpm","acqPoints","acqFinalPoints","ppmValue","ppmMHz","hzOffset","hzMHz","p90"].forEach(id=>$(id).oninput=acq);

function csp(){
 let h1=+$("cspH1").value,n1=+$("cspN1").value,h2=+$("cspH2").value,n2=+$("cspN2").value,a=+$("cspAlpha").value,out=Math.sqrt((h2-h1)**2+(a*(n2-n1))**2);$("cspOut").textContent=`${fmt(out,6)} ppm`;bulkCsp()
}
["cspH1","cspN1","cspH2","cspN2","cspAlpha"].forEach(id=>$(id).oninput=csp);
function bulkCsp(){
 let a=+$("cspAlpha").value;cspRows=parseRows($("cspTableInput").value,5).map(r=>{let h1=+r[1],n1=+r[2],h2=+r[3],n2=+r[4],dh=h2-h1,dn=n2-n1,w=Math.sqrt(dh**2+(a*dn)**2);return{res:r[0],dh,dn,w}});
 $("cspTableOut").innerHTML=cspRows.map(x=>`<tr><td>${esc(x.res)}</td><td>${fmt(x.dh,6)}</td><td>${fmt(x.dn,6)}</td><td><strong>${fmt(x.w,6)}</strong></td></tr>`).join("")
}
$("cspTableInput").oninput=bulkCsp;$("downloadCsp").onclick=()=>download("weighted_csp.csv","residue,delta_H,delta_N,weighted_CSP\n"+cspRows.map(x=>[x.res,x.dh,x.dn,x.w].join(",")).join("\n"));

function relax(){
 let t=+$("relT").value;$("relR").textContent=t>0?`${fmt(1000/t,5)} s⁻¹`:"—";
 let t1=+$("r2t1").value/1000,t2=+$("r2t2").value/1000,i1=+$("r2i1").value,i2=+$("r2i2").value,r=(i1>0&&i2>0&&t2!==t1)?-Math.log(i2/i1)/(t2-t1):NaN;$("r2two").textContent=Number.isFinite(r)?`${fmt(r,5)} s⁻¹`:"— s⁻¹";
 let A=+$("drA").value,B=+$("drB").value,d=B-A,p=A?d/A*100:NaN;$("drOut").textContent=`${d>=0?"+":""}${fmt(d,5)} · ${fmt(p,4)}%`;
 let cyc=+$("cpmgCycles").value,cm=+$("cpmgCycleMs").value,total=+$("cpmgTotal").value;$("cpmgDelay").textContent=`${fmt(cyc*cm,5)} ms`;$("cpmgNu").textContent=total>0?`${fmt(cyc/(total/1000),4)} Hz`:"— Hz";
 fitRelax();bulkDR()
}
["relT","r2t1","r2t2","r2i1","r2i2","drA","drB","cpmgCycles","cpmgCycleMs","cpmgTotal"].forEach(id=>$(id).oninput=relax);
function fitRelax(){
 let rows=parseRows($("fitInput").value,2).map(r=>({x:+r[0]/1000,y:+r[1]})).filter(p=>Number.isFinite(p.x)&&p.y>0);
 if(rows.length<2){["fitR","fitT","fitI0","fitRsq"].forEach(id=>$(id).textContent="—");return}
 let xs=rows.map(p=>p.x),ys=rows.map(p=>Math.log(p.y)),xm=xs.reduce((a,b)=>a+b,0)/xs.length,ym=ys.reduce((a,b)=>a+b,0)/ys.length;
 let sxx=xs.reduce((a,x)=>a+(x-xm)**2,0),sxy=xs.reduce((a,x,i)=>a+(x-xm)*(ys[i]-ym),0),slope=sxy/sxx,int=ym-slope*xm,R=-slope,I0=Math.exp(int);
 let ssTot=ys.reduce((a,y)=>a+(y-ym)**2,0),ssRes=ys.reduce((a,y,i)=>a+(y-(int+slope*xs[i]))**2,0),rsq=1-ssRes/ssTot;
 $("fitR").textContent=`${fmt(R,5)} s⁻¹`;$("fitT").textContent=R>0?`${fmt(1000/R,5)} ms`:"—";$("fitI0").textContent=fmt(I0,4);$("fitRsq").textContent=fmt(rsq,6)
}
$("fitInput").oninput=fitRelax;
function bulkDR(){
 drRows=parseRows($("drTableInput").value,3).map(r=>{let A=+r[1],B=+r[2],d=B-A,p=A?d/A*100:NaN;return{res:r[0],A,B,d,p}}).filter(x=>Number.isFinite(x.A)&&Number.isFinite(x.B));
 $("drTableOut").innerHTML=drRows.map(x=>`<tr><td>${esc(x.res)}</td><td>${fmt(x.A,5)}</td><td>${fmt(x.B,5)}</td><td>${x.d>=0?"+":""}${fmt(x.d,5)}</td><td>${fmt(x.p,4)}%</td></tr>`).join("")
}
$("drTableInput").oninput=bulkDR;$("downloadDR").onclick=()=>download("delta_R2.csv","residue,R2_A,R2_B,delta_R2,percent_change\n"+drRows.map(x=>[x.res,x.A,x.B,x.d,x.p].join(",")).join("\n"));

function timing(){
 let inc=Math.max(1,+$("timeInc").value||1),nus=Math.max(.01,Math.min(1,+$("timeNus").value||1)),sampled=Math.ceil(inc*nus),scans=Math.max(1,+$("timeScans").value||1),dummy=Math.max(0,+$("timeDummy").value||0),cycle=(+$("timeD1").value||0)+(+$("timeAq").value||0)+(+$("timeOver").value||0),trans=sampled*(scans+dummy),sec=trans*cycle;
 $("timeSampled").textContent=sampled;$("timeTransients").textContent=trans;$("timeHours").textContent=`${fmt(sec/3600,4)} h`;
 let h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=Math.round(sec%60);$("timeClock").textContent=`${h}h ${m}m ${s}s`;
 let n1=+$("snrN1").value,n2=+$("snrN2").value;$("snrOut").textContent=n1>0&&n2>0?`${fmt(Math.sqrt(n2/n1),4)}×`:"—"
}
["timeInc","timeScans","timeDummy","timeNus","timeD1","timeAq","timeOver","snrN1","snrN2"].forEach(id=>$(id).oninput=timing);

function sample(){
 let um=+$("sampUM").value,mw=+$("sampMW").value;$("sampMass").textContent=`${fmt(um*mw/1000,5)} mg/mL`;
 const k=1.380649e-23;let D=+$("diffD").value*1e-10,T=+$("diffT").value,eta=+$("diffEta").value*1e-3,Rh=D>0&&eta>0?k*T/(6*Math.PI*eta*D):NaN;$("diffRh").textContent=Number.isFinite(Rh)?`${fmt(Rh*1e9,5)} nm`:"— nm";
 let rh=+$("rhVal").value*1e-9,T2=+$("rhT").value,eta2=+$("rhEta").value*1e-3,D2=rh>0&&eta2>0?k*T2/(6*Math.PI*eta2*rh):NaN;$("rhD").textContent=Number.isFinite(D2)?`${D2.toExponential(4)} m²/s`:"—";
 let stock=+$("labC").value,frac=+$("labFrac").value,fin=+$("labFinal").value;let labTarget=frac*fin,unlabTarget=(1-frac)*fin,vl=stock>0?labTarget/stock:NaN,vu=stock>0?unlabTarget/stock:NaN;$("labOut").textContent=Number.isFinite(vl)?`Per 1 unit final volume: ${fmt(vl,6)} units labelled stock + ${fmt(vu,6)} units unlabelled stock (assuming equal stock concentrations of ${stock} µM).`:"Enter a positive stock concentration."
}
["sampUM","sampMW","diffD","diffT","diffEta","rhVal","rhT","rhEta","labC","labFrac","labFinal"].forEach(id=>$(id).oninput=sample);

acq();csp();relax();timing();sample();
})();