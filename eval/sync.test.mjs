import test from 'node:test';
import assert from 'node:assert/strict';
import loadTS from './helpers/load-ts.cjs';
function setup(storageFails = false) {
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
  upsert:async(rows)=>{writes.push({table,rows});return {error:null};},
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
