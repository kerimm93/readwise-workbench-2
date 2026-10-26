// Local browser acceptance with synthetic data only; no real service writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const runtimeRequire=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'_tests.cjs')):require;
const {chromium}=runtimeRequire('playwright'),{source}=require('./helpers.cjs');
(async()=>{
 const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':'text/plain');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await ctx.newPage(),errors=[],external=[];
 p.on('pageerror',e=>errors.push(e.message));const origin='http://127.0.0.1:'+server.address().port;
 await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();external.push(r.request().url());return r.abort();});
 await p.goto(origin);await p.getByRole('heading',{name:'Was bleibt hängen?'}).waitFor();
 await p.evaluate(async sources=>{S.intake.start_at='2026-09-01T00:00:00.000Z';await commit(ingest(S,sources,'2026-10-26T10:00:00Z',true).state);render();},[source('101'),source('102'),source('103')]);
 const idle=()=>p.waitForFunction(()=>!BUSY),confirm=async()=>{await p.locator('#dialog[open]').waitFor();await p.locator('#modalOK').click();await idle();};
 const card=id=>p.locator('.candidate').filter({has:p.getByRole('checkbox',{name:'Highlight '+id+' auswählen',exact:true})});
 await card('101').getByText('Verwendung & Intention',{exact:false}).click();await p.getByLabel('Verwendung 101',{exact:true}).selectOption('feynman');await p.getByLabel('Verwendungsintention 101',{exact:true}).fill('Ich möchte diese Quelle aufnehmen.');await card('101').getByRole('button',{name:'Vorauswahl speichern'}).click();await idle();
 await p.reload();await p.getByRole('heading',{name:'Was bleibt hängen?'}).waitFor();await card('101').getByText('Verwendung & Intention',{exact:false}).click();assert.equal(await p.getByLabel('Verwendung 101',{exact:true}).inputValue(),'feynman');assert.equal(await p.getByLabel('Verwendungsintention 101',{exact:true}).inputValue(),'Ich möchte diese Quelle aufnehmen.');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=390),true);
 await card('102').getByText('Verwendung & Intention',{exact:false}).click();await card('102').getByRole('button',{name:'Highlight verwerfen …',exact:true}).click();await confirm();assert.equal(await card('102').count(),0);
 await p.getByLabel('Verwendung filtern',{exact:true}).selectOption('reflection');await p.getByRole('button',{name:'1',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Verarbeitung beginnen →'}).isDisabled(),true);
 await p.getByLabel('Verwendung filtern',{exact:true}).selectOption('feynman');await p.getByRole('button',{name:'1',exact:true}).click();assert.match(await p.locator('#selectionCount').innerText(),/1 ausgewählt · IDs: 101/);
 await p.getByRole('button',{name:'Verarbeitung beginnen →'}).click();await idle();
 const batch=await p.evaluate(()=>({id:S.sessions.at(-1).id,input:inputFor(S.sessions.at(-1)),prompt:buildStartPrompt(S.sessions.at(-1))}));assert.equal(batch.input.highlights.length,1);assert.equal(batch.input.highlights[0].triage.use,'feynman');assert.match(batch.prompt,/Ich möchte diese Quelle aufnehmen/);
 // An app decision made while a batch exists must not be overwritten by its later handoff.
 await p.getByText('Quellen & bisherige Zuordnungen',{exact:true}).click();await p.getByRole('button',{name:'Highlight verwerfen …',exact:true}).click();await confirm();
 const h=await p.evaluate(id=>{const s=session(id),items=[{highlight_id:'101',outcome:'processed',route:'freie_sprintnotiz',user_processing:{},actions:[{description:'Synthetischer Abschluss',status:'completed',details:{free:true}}],artifacts:[],anki:null,notes:''}];return {type:'readwise-workbench-handoff-v2',version:'2.1',session:{session_id:id,input_count:1,completed_at:null},items,summary:summarizeHandoff(items),errors:[]};},batch.id);
 await p.getByLabel('JSON-Handoff aus dem Chat').fill(JSON.stringify(h));await p.getByRole('button',{name:'Prüfen & übernehmen',exact:true}).click();await p.locator('#modalOK').click();await p.getByText('Zwischenzeitliche App-Entscheidung',{exact:true}).waitFor();await confirm();
 assert.equal(await p.evaluate(()=>candidateStatus(candidate('101'))),'discarded');assert.equal(await p.evaluate(()=>processingLog().length),3);
 // Reopen from history through the real UI; prior discard and historical result remain.
 await p.evaluate(()=>go('history'));await p.getByRole('button',{name:'Bewusst wieder aufgreifen',exact:true}).first().click();await confirm();assert.equal(await p.evaluate(()=>processingLog().length),4);
 await p.reload();await p.getByRole('heading',{name:'Verarbeitungsprotokoll'}).waitFor();assert.equal(await p.evaluate(()=>processingLog().length),4);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log(JSON.stringify({ok:true,browser:await browser.version(),viewport:390,checks:['triage IndexedDB reload','mobile form no overflow','confirmed discard','empty filter disabled','filtered fixed batch','historical handoff conflict UI','reopen preserves history'],externalRequests:0},null,2));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
