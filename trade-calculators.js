/* Standalone QSE / PSX quick calculators; never depends on journal rendering. */
(function(){
"use strict";
const defaults={qa:{buy:0.275,sell:0.275,levy:0},ps:{buy:0.15,sell:0.15,tax:15,cdc:0.005}};
const get=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k));return v&&typeof v==="object"?v:f}catch(_){return f}};
const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
const fmt=(n,dp=3)=>Number(n).toLocaleString("en-US",{minimumFractionDigits:dp,maximumFractionDigits:dp});
const valid=n=>Number.isFinite(n)&&n>=0;
function mount(ex){
 const root=document.getElementById("calc-"+ex);if(!root)return;
 const state=get("tj.calculator."+ex,{oldQty:"0",oldAvg:"0",qty:"",price:"",symbol:""});
 const journal=get("tj.fees",{});
 const fee=get("tj.calculator.fees."+ex,ex==="qa"?{buy:Number(journal.q??defaults.qa.buy),sell:Number(journal.q??defaults.qa.sell),levy:0}:{buy:Number(journal.c??defaults.ps.buy),sell:Number(journal.c??defaults.ps.sell),tax:Number(journal.s??defaults.ps.tax),cdc:Number(journal.d??defaults.ps.cdc)});
 const fields=[["symbol","Stock / symbol","text"],["oldQty","Existing shares (0 = new position)","number"],["oldAvg","Existing average cost per share (0 = new position)","number"],["qty","New buy quantity","number"],["price","New buy price per share","number"]];
 const feeFields=ex==="qa"?[["buy","Buy commission (%)"],["sell","Sell commission (%)"],["levy","Other charges per share (QAR)"]]:[["buy","Buy commission (%)"],["sell","Sell commission (%)"],["tax","Tax on commission (%)"],["cdc","CDC / other charge per share (PKR)"]];
 const fieldHTML=fields.map(([k,label,type])=>'<label style="display:block;margin:10px 0">'+label+'<input data-field="'+k+'" type="'+type+'" '+(type==="number"?'min="0" step="any" inputmode="decimal"':'')+' style="display:block;width:100%;max-width:340px" value=""></label>').join("");
 const feeHTML=feeFields.map(([k,label])=>'<label style="display:block;margin:8px 0">'+label+'<input data-fee="'+k+'" type="number" min="0" step="any" style="display:block;width:100%;max-width:200px"></label>').join("");
 root.innerHTML='<div class="card"><p class="mut">Enter 0 existing shares and 0 existing average for a new position. Existing average should include historical buy fees.</p>'+fieldHTML+'<details><summary>Broker fees (editable)</summary>'+feeHTML+'<button type="button" class="btn" data-reset-fees>Reset broker defaults</button></details><div data-results aria-live="polite"></div></div>';
 root.querySelectorAll("[data-field]").forEach(el=>{el.value=state[el.dataset.field]??""});
 root.querySelectorAll("[data-fee]").forEach(el=>{el.value=fee[el.dataset.fee]??0});
 const read=attr=>Object.fromEntries([...root.querySelectorAll("["+attr+"]")].map(el=>[el.getAttribute(attr),el.value]));
 function calculate(){
  const f=read("data-field"),settings=read("data-fee");set("tj.calculator."+ex,f);set("tj.calculator.fees."+ex,settings);
  const qty=Number(f.qty),price=Number(f.price),oldQty=Number(f.oldQty),oldAvg=Number(f.oldAvg);
  const nums=Object.values(settings).map(Number),out=root.querySelector("[data-results]");
  if(![qty,price,oldQty,oldAvg,...nums].every(valid)||qty<=0||price<=0||(oldQty>0&&oldAvg<=0)){
   out.innerHTML='<p class="note">Enter a positive buy quantity and price. For an existing holding, enter both its shares and its fee-inclusive average cost.</p>';return;
  }
  const fBuy=Number(settings.buy)/100,fSell=Number(settings.sell)/100,tax=ex==="ps"?1+Number(settings.tax)/100:1;
  const perShare=ex==="ps"?Number(settings.cdc):Number(settings.levy);
  const buyFees=qty*(price*fBuy*tax+perShare),grossValue=qty*price,netBuy=grossValue+buyFees;
  const totalQty=qty+oldQty,oldBasis=oldQty*oldAvg;
  const grossAvg=(oldBasis+grossValue)/totalQty,netAvg=(oldBasis+netBuy)/totalQty;
  const sellRate=fSell*tax;
  if(sellRate>=1){out.textContent="Selling fees must be below 100%.";return}
  const rawBE=(netAvg+perShare)/(1-sellRate),tick=ex==="ps"||rawBE>=10?0.01:0.001;
  const be=Math.ceil((rawBE-1e-10)/tick)*tick,dp=ex==="ps"?2:3;
  const items=[["Gross buy value",fmt(grossValue,2)],["Buy commission & charges",fmt(buyFees,2)],["Gross new-buy average",fmt(price,dp)],["New-buy average after fees",fmt(netBuy/qty,dp)],["Gross combined average",fmt(grossAvg,dp)],["Combined average after fees",fmt(netAvg,dp)],["Break-even selling price",fmt(be,dp)]];
  out.innerHTML='<h3>Results'+(f.symbol?" — "+String(f.symbol).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])):"")+'</h3><div class="grid">'+items.map(([k,v])=>'<div><span class="mut">'+k+'</span><h2>'+v+'</h2></div>').join("")+'</div><p class="note">Total shares after buy: '+fmt(totalQty,0)+' · New buy total including fees: '+fmt(netBuy,2)+' · Break-even includes estimated selling charges and is rounded up to the next price tick. '+(ex==="qa"?"QAR":"PKR")+'. Estimates only; broker tariffs and exchange tick rules may differ.</p>';
 }
 root.addEventListener("input",calculate);
 root.querySelector("[data-reset-fees]").addEventListener("click",()=>{const v=defaults[ex];root.querySelectorAll("[data-fee]").forEach(el=>el.value=v[el.dataset.fee]);calculate()});
 calculate();
}
function init(){mount("qa");mount("ps")}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
