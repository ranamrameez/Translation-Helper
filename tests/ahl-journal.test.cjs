const assert=require('node:assert/strict');const test=require('node:test');const {calculate}=require('../ahl-journal.js');
const t=(d,k,u,q,amt,fee=0)=>({d,k,u,q,amt,fee,rate:1});
test('weighted average partial sale with fees included',()=>{const r=calculate({tx:[t('01/01/2026','buy','ABC',10,101),t('02/01/2026','buy','ABC',10,201),t('03/01/2026','sell','ABC',5,98)]});assert.equal(r.realized,22.5);assert.equal(r.open[0].q,15);assert.equal(r.open[0].cost,226.5)});
test('same day difference is realized cash without changing holdings',()=>{const r=calculate({tx:[t('01/01/2026','difference','ABC',5,12)]});assert.equal(r.realized,12);assert.equal(r.open.length,0)});
test('oversold positions are flagged, not counted as free profit',()=>{const r=calculate({tx:[t('01/01/2026','sell','ABC',5,100)]});assert.equal(r.realized,0);assert.equal(r.issues[0].type,'missing-opening-position')});
test('duplicate rows are not counted twice',()=>{const x=t('01/01/2026','buy','ABC',5,50);const r=calculate({tx:[x,x]});assert.equal(r.open[0].q,5);assert.equal(r.duplicates,1)});
test('matching net quantities by settlement date',()=>{const r=calculate({tx:[t('02/01/2026','buy','ABC',3,30)]},[{d:'01/01/2026',c:'02/01/2026',u:'ABC',t:'buy',q:3}]);assert.equal(r.matched,true)});
test('mismatch is visible',()=>{const r=calculate({tx:[t('02/01/2026','buy','ABC',3,30)]},[{c:'02/01/2026',u:'ABC',t:'buy',q:4}]);assert.equal(r.mismatches.length,1)});
