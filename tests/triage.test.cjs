const test=require('node:test'),assert=require('node:assert/strict');
const {app,source,seed,session,handoff}=require('./helpers.cjs');
const json=x=>JSON.parse(JSON.stringify(x));
test('legacy triage migration normalizes base and remote without changing old inputs',()=>{
 const a=app();seed(a);const s=session(a);const old=json(a.S);old.candidates.forEach(c=>{delete c.triage;delete c.reopen_events});old.sessions.forEach(s=>s.items.forEach(i=>delete i.triage));
 const normalized=a.validateState(old);assert.equal(normalized.candidates[0].triage.use,'');assert.equal(normalized.sessions[0].items[0].triage.intention,'');assert.equal(old.candidates[0].triage,undefined);assert.equal(a.mergeStates(normalized,old,old).conflicts.length,0);
});
test('filters, selection and snapshot preserve sort, intentions, full source and custom prompts',()=>{
 const a=app();seed(a,[source('101'),source('102',{highlighted_at:'2026-09-23T12:00:00Z'}),source('103')]);
 a.S=a.setTriage(a.S,'101',{use:'feynman',intention:'Ich will diese Quelle aufnehmen. {{COUNT}} <script>test</script>'});
 a.S=a.setTriage(a.S,'102',{use:'other',intention:'Ich möchte meine Sprintnotiz ergänzen.'});
 a.UI.useFilter='feynman';a.pick(5);assert.deepEqual(json(a.UI.selected),['101']);
 a.changeInboxFilter('useFilter','reflection');assert.equal(a.UI.selected.length,0);a.pick(5);assert.equal(a.UI.selected.length,0);assert.throws(()=>a.newSession(a.S,[],'notion'),/1–30/);
 a.UI.useFilter='';assert.deepEqual(json(a.filteredInbox().map(c=>c.id)),['103']); // empty means undecided
 a.UI.useFilter='all';a.UI.inboxSort='oldest';a.pick(5);assert.deepEqual(json(a.UI.selected),['101','103','102']);
 a.S.workflows[0].start_template='Meine eigenen Regeln. {{HIGHLIGHTS_JSON_OR_MARKDOWN}}';const s=session(a,['101'],'notion');
 a.S=a.setTriage(a.S,'101',{use:'reflection',intention:''});a.S.candidates[0].source.text='Nachträglich geändert';
 const p=a.buildStartPrompt(s);assert.match(p,/Meine eigenen Regeln/);assert.match(p,/Ich will diese Quelle aufnehmen/);assert.match(p,/\{\{COUNT\}\}/);assert.match(p,/gebündelte Aufnahme/);assert.match(p,/Während dieses ersten Triage-Durchlaufs keine externen Writes/);assert.match(p,/ursprünglicher Reihenfolge/);assert.equal(s.items[0].triage.use,'feynman');assert.notEqual(s.items[0].source.text,'Nachträglich geändert');
 assert.equal(a.validateState(json(a.S)).candidates[0].triage.use,'reflection');
});
test('partial batches enforce exact IDs, keep free fields and idempotence across sequential batches',()=>{
 const a=app();seed(a,[source('101'),source('102')]);const s=session(a,['101'],'notion'),h=handoff(a,s,'reading_journal');h.items[0].actions=[{description:'Tatsächlich abgeschlossen',status:'completed',details:{free:['Sprint','Prosa']}}];h.extra={free:true};
 const missing=json(h);missing.items=[];assert.throws(()=>a.validateHandoff(missing,s));const foreign=json(h);foreign.items[0].highlight_id='102';assert.throws(()=>a.validateHandoff(foreign,s));const dup=json(h);dup.items.push(dup.items[0]);assert.throws(()=>a.validateHandoff(dup,s));
 a.S=a.applyHandoff(a.S,s.id,h).state;assert.equal(a.applyHandoff(a.S,s.id,h).noop,true);assert.equal(a.processingLog().length,1);assert.equal(a.processingLog()[0].result.actions[0].details.free[0],'Sprint');
 const b=session(a,['102'],'notion');a.S=a.applyHandoff(a.S,b.id,handoff(a,b,'defer')).state;assert.equal(a.candidateStatus(a.S.candidates[0]),'processed');assert.equal(a.candidateStatus(a.S.candidates[1]),'deferred');
});
test('confirmed app discard, conflict and reopen preserve both historical and current decisions',async()=>{
 const a=app();seed(a);a.S=a.setTriage(a.S,'101',{use:'other',intention:'Ich möchte das nicht weiter verfolgen.'});const s=session(a,['101'],'notion'),h=handoff(a,s,'reading_journal');
 a.S=a.discardState(a.S,'101');assert.equal(a.candidateStatus(a.S.candidates[0]),'discarded');assert.equal(a.eligible().length,0);assert.throws(()=>a.newSession(a.S,['101'],'notion'));assert.throws(()=>a.applyHandoff(a.S,s.id,h),/App-Entscheidung/);
 a.S=a.applyHandoff(a.S,s.id,h,true).state;assert.equal(a.candidateStatus(a.S.candidates[0]),'discarded');assert.equal(a.processingLog().length,2);assert.equal(a.processingLog().find(e=>e.result.outcome==='discarded').result.notes,'Ich möchte das nicht weiter verfolgen.');
 await a.resurface('101');assert.equal(a.candidateStatus(a.S.candidates[0]),'resurfaced');assert.equal(a.processingLog().length,3);assert.equal(a.processingLog().filter(e=>e.result.event_kind==='reopened').length,1);assert.equal(a.applyHandoff(a.S,s.id,h).noop,true);
});
test('cancel discard does nothing; historical Anki import cannot queue stale writes',async()=>{
 const a=app();seed(a);a.ask=async()=>false;const before=json(a.S);await a.discardCandidate('101');assert.deepEqual(json(a.S),before);
 const s=session(a);a.S=a.discardState(a.S,'101');assert.throws(()=>a.applyHandoff(a.S,s.id,handoff(a,s),true),/Anki-Payload blockiert/);assert.equal(a.allCards().length,0);
});
test('triage and audit metadata survive encryption; concurrent edits use existing candidate conflict',async()=>{
 const a=app();seed(a);const base=json(a.S),local=a.setTriage(base,'101',{use:'feynman',intention:'Ich nehme es auf.'}),remote=a.setTriage(base,'101',{use:'other',intention:'Ich verwende es im Sprint.'});
 const merge=a.mergeStates(local,remote,base);assert.equal(merge.conflicts[0].key,'candidates:101');assert.equal(a.mergeStates(local,remote,base,{'candidates:101':'remote'}).state.candidates[0].triage.use,'other');
 const encrypted=await a.encryptState(local,'test-passphrase');a.passphrase='test-passphrase';const restored=await a.decodeGist(JSON.stringify(encrypted));assert.equal(restored.candidates[0].triage.intention,'Ich nehme es auf.');
});
