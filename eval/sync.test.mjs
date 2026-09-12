import test from 'node:test';
import assert from 'node:assert/strict';
import loadTS from './helpers/load-ts.cjs';
function setup(storageFails = false, missingColumns = []) {
 const storage = new Map();
 const localStorage = {
  getItem: (k) => { if (storageFails) throw Error('private'); return storage.get(k) ?? null; },
  setItem: (k,v) => { if (storageFails) throw Error('private'); storage.set(k,v); },
 };
 const store = loadTS('src/lib/store.ts', {react: {}, './types':{uid:()=> 'id'}, './reportScore':{hasVerifiedReportScore:()=>true}}, {localStorage});
 let user = null, time = 0, failed = false, deleteFailed = false, hold = null;
 const reads = [], writes = [], deletes = [], cloud = { reports: [], deadlines: [], lessons: [], scenarios: [] }, intervals = [], timers = new Map(); let nextTimer = 0;
 const win = { setInterval:(f)=>{intervals.push(f);return intervals.length;}, clearTimeout:(id)=>timers.delete(id), setTimeout:(f)=>{timers.set(++nextTimer,f);return nextTimer;} };
 const db = { from:(table)=>({
  select:()=>({eq:async (column,id)=>{reads.push({table,column,id});if(hold) await hold; return failed?{data:null,error:{message:'offline'}}:{data:cloud[table],error:null};}}),
  upsert:async(rows)=>{
    // PostgREST rejects the WHOLE upsert when one column is unknown.
    const absent = missingColumns.find((c)=>rows.some((r)=>c in r));
    if (absent) return {error:{code:'PGRST204',message:`Could not find the '${absent}' column of '${table}' in the schema cache`}};
    writes.push({table,rows});return {error:null};
  },
  delete:()=>({eq:(column,uid)=>({eq:async(idColumn,id)=>{
    deletes.push({table,column,uid,idColumn,id});
    if(deleteFailed) return {error:{message:'delete unavailable'}};
    cloud[table]=cloud[table].filter(row=>row.id!==id);return {error:null};
  }})}),
 })};
 const sync = loadTS('src/lib/sync.ts', {
  './auth':{getAuth:()=>({user})}, './store':store, './supabase':{supabase:db}, './reportScore':{hasVerifiedReportScore:()=>false},
 }, {window:win,Date:class extends Date {static now(){return time;}},console:{warn:()=>{}}}, 'export { pull, push };');
 const login = (id) => {user=id?{id}:null; store.setStoreOwner(id);};
 return {store,sync,reads,writes,deletes,cloud,intervals,timers,login,localStorage,setDeleteFailure:(v)=>deleteFailed=v,setFailure:(v)=>failed=v,advance:()=>time+=5001,setHold:(v)=>hold=v};
}

test('account caches stay separate and legacy local records are not silently uploaded', async()=>{
 const h=setup(); h.store.actions.addLesson({text:'local',kind:'wording'});
 h.login('A'); assert.equal(h.store.getStore().lessons.length,0);
 h.store.actions.addLesson({text:'A only',kind:'wording'});
 h.login('B'); assert.equal(h.store.getStore().lessons.length,0);
 await h.sync.pull(); await h.sync.push(h.store.getStore()); assert.equal(h.writes.length,0);
 h.login('A'); assert.equal(h.store.getStore().lessons[0].text,'A only');
 h.login(null); assert.equal(h.store.getStore().lessons[0].text,'local');
});

test('partitioning survives unavailable localStorage within the running app',()=>{
 const h=setup(true);h.login('A');h.store.actions.addLesson({text:'A',kind:'wording'});
 h.login('B');assert.equal(h.store.getStore().lessons.length,0);
 h.login('A');assert.equal(h.store.getStore().lessons[0].text,'A');
});

test('failed reads report error, do not push, and retry after backoff',async()=>{
 const h=setup();h.login('A');h.setFailure(true);
 let state;h.sync.onSync((s)=>state=s);
 assert.equal(await h.sync.pull(),false);assert.equal(state,'error');
 await h.sync.push(h.store.getStore());assert.equal(h.writes.length,0);
 await h.sync.pull();assert.equal(h.reads.length,4);
 h.advance();h.setFailure(false);assert.equal(await h.sync.pull(),true);
 assert.equal(state,'saved');assert.equal(h.reads.length,8);
 assert.ok(h.reads.every(r=>r.column==='user_id'&&r.id==='A'));
});

test('late reads are discarded after account switch, including A to B to A',async()=>{
 const h=setup();h.login('A');let release;h.setHold(new Promise(r=>release=r));
 const pending=h.sync.pull();h.login('B');h.login('A');release();
 assert.equal(await pending,false);
 h.setHold(null);assert.equal(await h.sync.pull(),true);
});

test('startup is idempotent and pending uploads are cancelled on account change',async()=>{
 const h=setup();h.login('A');h.sync.startSync();h.sync.startSync();assert.equal(h.intervals.length,1);
 await h.sync.pull();h.store.actions.addLesson({text:'A',kind:'wording'});assert.equal(h.timers.size,1);
 h.login('B');assert.equal(h.timers.size,0);assert.equal(h.store.getStore().lessons.length,0);
});


test('offline deletion is hidden on pull and sent only for its owning account',async()=>{
 const h=setup();h.login('A');h.store.actions.addLesson({text:'Remove me',kind:'wording'});
 h.store.actions.removeLesson('id');
 h.cloud.lessons=[{id:'id',kind:'wording',text:'Remove me',used_on:0,created_at:new Date(0).toISOString()}];
 await h.sync.pull();assert.equal(h.store.getStore().lessons.length,0);
 await h.sync.push(h.store.getStore());
 assert.equal(h.deletes.length,1);assert.equal(h.deletes[0].uid,'A');assert.equal(h.deletes[0].idColumn,'id');
 assert.equal(h.store.getStore().pendingDeletes.lessons.length,0);
 assert.equal(h.cloud.lessons.length,0);
});

test('failed deletes remain queued and retry after backoff',async()=>{
 const h=setup();h.login('A');await h.sync.pull();
 h.store.actions.addLesson({text:'Delete',kind:'wording'});h.store.actions.removeLesson('id');
 h.setDeleteFailure(true);await h.sync.push(h.store.getStore());
 assert.equal(h.store.getStore().pendingDeletes.lessons.length,1);
 await h.sync.push(h.store.getStore());assert.equal(h.deletes.length,1);
 h.setDeleteFailure(false);h.advance();await h.sync.push(h.store.getStore());
 assert.equal(h.deletes.length,2);assert.equal(h.store.getStore().pendingDeletes.lessons.length,0);
});

test('generated scenario delete persists across reload and is isolated from other users',()=>{
 const h=setup();h.login('A');h.store.actions.addScenario({id:'scenario-1',source:'generated'});
 h.store.actions.removeScenario('scenario-1');
 const restored=loadTS('src/lib/store.ts',{react:{},'./types':{uid:()=> 'id'},'./reportScore':{hasVerifiedReportScore:()=>true}},{localStorage:h.localStorage});
 restored.setStoreOwner('B');assert.equal(restored.getStore().pendingDeletes,undefined);
 restored.setStoreOwner('A');assert.equal(restored.getStore().pendingDeletes.scenarios[0],'scenario-1');
});

test('clearing device data does not turn an empty cache into a remote wipe',async()=>{
 const h=setup();h.login('A');await h.sync.pull();h.store.actions.wipe();
 await h.sync.push(h.store.getStore());assert.equal(h.deletes.length,0);
});

// --- report metadata across the cloud --------------------------------------

const REPORT = (over = {}) => ({
 callId: 'call1', summary: 'The written review is unavailable.', items: [
  { signId: 's1', key: 'hardship-request', title: 'Cannot meet the repayments', kind: 'legal', verdict: 'unverified', note: 'Not verified.' },
 ], missedByAI: [], tip: '', score: 0, caught: 1, handled: 0, partly: 0, missed: 0,
 deadlines: [], durationSec: 42, model: '', mode: 'live', customer: 'Customer', at: 0, ...over,
});

test('a degraded report keeps its reason and its coaching mode across the cloud', async()=>{
 const h=setup(); h.login('A');
 h.store.actions.addReport(REPORT({degraded:true,degradedReason:'quota',scoreUnverified:true,unverified:1,coaching:false}));
 await h.sync.pull(); await h.sync.push(h.store.getStore());
 const row=h.writes.find(w=>w.table==='reports').rows[0];
 assert.equal(row.degraded,true); assert.equal(row.degraded_reason,'quota');
 assert.equal(row.coaching,false); assert.equal(row.score_unverified,true); assert.equal(row.unverified,1);
 // Another device pulls the row this push actually produced.
 const b=setup(); b.login('B'); b.cloud.reports.push({...row,user_id:'B'});
 await b.sync.pull();
 const back=b.store.getStore().reports[0];
 assert.equal(back.degraded,true); assert.equal(back.degradedReason,'quota'); assert.equal(back.coaching,false);
 assert.equal(back.unverified,1); assert.equal(back.scoreUnverified,true);
});

test('a reports table without the metadata columns still receives every report', async()=>{
 // The schema lives in the dashboard, so the client finds out by being refused.
 const h=setup(false,['degraded','coaching','score_unverified','unverified','degraded_reason']);
 h.login('A'); h.store.actions.addReport(REPORT({degraded:true,degradedReason:'quota'}));
 let state; h.sync.onSync((x)=>state=x);
 await h.sync.pull(); await h.sync.push(h.store.getStore());
 assert.equal(state,'saved','a schema that has not caught up must not cost the reports');
 const written=h.writes.filter(w=>w.table==='reports');
 assert.equal(written.length,1,'the rejected attempt is not counted as a write');
 const row=written[0].rows[0];
 for (const c of ['degraded','degraded_reason','coaching','score_unverified','unverified']) assert.ok(!(c in row),`${c} was dropped`);
 assert.equal(row.id,'call1'); assert.equal(row.summary,REPORT().summary);
});

test('a row written before these columns existed comes back without inventing them', async()=>{
 const h=setup(); h.login('A');
 const legacy=REPORT();
 h.cloud.reports.push({
  id:legacy.callId, mode:'live', customer:'Customer', score:88, caught:1, handled:1, partly:0, missed:0,
  summary:legacy.summary, tip:'Ask sooner.', items:legacy.items, missed_by_ai:[], duration_sec:42,
  model:'gemini', at:new Date(0).toISOString(), user_id:'A',
 });
 await h.sync.pull();
 const r=h.store.getStore().reports[0];
 assert.equal(r.degraded,undefined,'absent is not false');
 assert.equal(r.degradedReason,undefined);
 assert.equal(r.coaching,undefined,'the mode was never recorded, which is not coaching being off');
 assert.equal(r.unverified,1,'derived from the items the row does carry');
 assert.equal(r.scoreUnverified,true,'an unverified item still withholds the score');
});
