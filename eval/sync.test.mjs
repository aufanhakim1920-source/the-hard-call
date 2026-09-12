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
 let user = null, time = 0, failed = false, hold = null;
 const reads = [], writes = [], intervals = [], timers = new Map(); let nextTimer = 0;
 const win = { setInterval:(f)=>{intervals.push(f);return intervals.length;}, clearTimeout:(id)=>timers.delete(id), setTimeout:(f)=>{timers.set(++nextTimer,f);return nextTimer;} };
 const db = { from:(table)=>({
  select:()=>({eq:async (column,id)=>{reads.push({table,column,id});if(hold) await hold; return failed?{data:null,error:{message:'offline'}}:{data:[],error:null};}}),
  upsert:async(rows)=>{writes.push({table,rows});return {error:null};},
 })};
 const sync = loadTS('src/lib/sync.ts', {
  './auth':{getAuth:()=>({user})}, './store':store, './supabase':{supabase:db}, './reportScore':{hasVerifiedReportScore:()=>false},
 }, {window:win,Date:class extends Date {static now(){return time;}},console:{warn:()=>{}}}, 'export { pull, push };');
 const login = (id) => {user=id?{id}:null; store.setStoreOwner(id);};
 return {store,sync,reads,writes,intervals,timers,login,setFailure:(v)=>failed=v,advance:()=>time+=5001,setHold:(v)=>hold=v};
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
