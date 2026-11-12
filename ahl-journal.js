/* AHL reconciliation and weighted-average accounting. No storage side effects. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.AHLJournal=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const dateKey=d=>{const p=String(d||"").split("/");return p.length===3?p[2]+p[1]+p[0]:String(d||"")};
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const id=t=>[t.d,t.k,t.u,t.q,t.rate,t.amt,t.fee].join("|");
function unique(items){const seen=new Set();return(items||[]).filter(x=>{const k=id(x);if(seen.has(k))return false;seen.add(k);return true})}
function calculate(ledger,orders){
 const transactions=unique((ledger&&ledger.tx)||[]).slice().sort((a,b)=>dateKey(a.d).localeCompare(dateKey(b.d)));
 const positions={},closed=[],issues=[],byStock={};let realized=0,fees=0;
 for(const t of transactions){
  const q=Number(t.q),amount=Number(t.amt),fee=Number(t.fee)||0,k=t.k,u=String(t.u||"").trim().toUpperCase();
  if(!u||!Number.isFinite(q)||q<=0||!Number.isFinite(amount)){issues.push({type:"invalid",transaction:t});continue}
  fees+=fee;
  const p=positions[u]||(positions[u]={u,q:0,cost:0});
  if(k==="buy"){if(amount<0){issues.push({type:"invalid-buy",transaction:t});continue}p.q+=q;p.cost+=amount}
  else if(k==="sell"){
   if(q>p.q+1e-8){issues.push({type:"missing-opening-position",transaction:t,available:p.q});continue}
   const basis=p.q?p.cost*q/p.q:0,profit=amount-basis;
   p.q-=q;p.cost-=basis;if(Math.abs(p.q)<1e-8){p.q=0;p.cost=0}
   realized+=profit;byStock[u]=(byStock[u]||0)+profit;
   closed.push({d:t.d,u,q,proceeds:amount,basis,profit,avgCost:basis/q});
  }else if(k==="difference"){realized+=amount;byStock[u]=(byStock[u]||0)+amount;closed.push({d:t.d,u,q,proceeds:amount,basis:0,profit:amount,sameDay:true})}
  else issues.push({type:"unknown-kind",transaction:t});
 }
 const orderGroups=new Map();
 for(const o of orders||[]){const k=[dateKey(o.c||o.d),String(o.u).toUpperCase(),String(o.t).toLowerCase()].join("|");orderGroups.set(k,(orderGroups.get(k)||0)+Number(o.q||0))}
 const ledgerGroups=new Map();
 for(const t of transactions){if(t.k==="difference")continue;const k=[dateKey(t.d),String(t.u).toUpperCase(),t.k].join("|");ledgerGroups.set(k,(ledgerGroups.get(k)||0)+Number(t.q||0))}
 // AHL nets same-day buys/sells into Difference; compare daily signed net quantities.
 const net=(rows,order)=>{const m=new Map();for(const t of rows){if(t.k==="difference")continue;const k=[dateKey(order?(t.c||t.d):t.d),String(t.u).toUpperCase()].join("|");const sign=(order?t.t:t.k)==="buy"?1:-1;m.set(k,(m.get(k)||0)+sign*Number(t.q))}return m};
 const a=net(orders||[],true),b=net(transactions,false),mismatches=[];
 if((orders||[]).length&&transactions.length)for(const k of new Set([...a.keys(),...b.keys()])){const oq=a.get(k)||0,lq=b.get(k)||0;if(Math.abs(oq-lq)>1e-7)mismatches.push({key:k,orderNet:oq,ledgerNet:lq})}
 const open=Object.values(positions).filter(p=>p.q>1e-8).map(p=>({...p,avgCost:p.cost/p.q}));
 return {method:"weighted-average",realized:round(realized),fees:round(fees),open,closed,byStock,issues,mismatches,duplicates:((ledger&&ledger.tx)||[]).length-transactions.length,matched:mismatches.length===0&&issues.length===0&&!!(orders||[]).length&&!!transactions.length};
}
return {calculate,unique,dateKey};
});
