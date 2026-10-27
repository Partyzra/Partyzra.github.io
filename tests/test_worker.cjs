const assert = require('node:assert/strict');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const root = path.join(__dirname, '..');
const database = new DatabaseSync(':memory:');
function sql(command, values = []) {
  const statement = database.prepare(command.replace(/\?(\d+)/g, '?'));
  let rows; try { rows = statement.columns().length ? statement.all(...values) : (statement.run(...values), []); } catch(e) { console.error("SQL FAILURE", e.message, command.slice(0,220), values); throw e; }
  return { results: rows, success: true, meta: { size_after: 8192, duration: 0.4 } };
}
function migrate() {
  const schema = fs.readFileSync(path.join(root,'tests','schema-v1-reference.sql'),'utf8');
  for(const stmt of schema.split(';').map(x=>x.trim()).filter(Boolean)) sql(stmt);
  sql("INSERT INTO events(event_type,page,label,session_id) VALUES('page_view','/home','Home','legacy1234')");
  assert.equal(sql('SELECT COUNT(*) AS n FROM events').results[0].n,1);
  const migration=fs.readFileSync(path.join(root,'cloudflare-worker','migrate-v2.9.sql'),'utf8');
  for (const stmt of migration.split('\n').filter(line=>!line.trim().startsWith('--')).join('\n').split(';').map(x=>x.trim()).filter(Boolean)) sql(stmt);
  const columns = sql('PRAGMA table_info(events)').results.map(x=>x.name);
  assert(columns.includes('visitor_id'));
  assert.equal(sql('SELECT COUNT(*) AS n FROM events').results[0].n,1);
  assert.equal(sql('SELECT visitor_id FROM events').results[0].visitor_id,null);
}
const fakeDb={prepare(text){let args=[];return {bind(...vals){args=vals;return this;}, async run(){return sql(text,args);}}}};
const env={DB:fakeDb,DASHBOARD_PASSWORD:'unit-test-secret', EXCLUDED_IPS:'198.51.100.5', SITE_ORIGIN:'https://partyzra.github.io'};
const makeEvent = (sid, visitor=null) => new Request('https://partyzra-analytics.test/track', {
 method:'POST',headers:{Origin:'https://partyzra.github.io','CF-Connecting-IP':'203.0.113.8','Content-Type':'text/plain'},
 body:JSON.stringify({event_type:'page_view',page:'/home',label:'Home', session_id:sid,...(visitor?{visitor_id:visitor}:{})})
});
async function main(){
 try {
  migrate();
  const src=fs.readFileSync(path.join(root,'cloudflare-worker','worker.js'),'utf8');
  const m = await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
  const worker=m.default;
  let r=await worker.fetch(new Request('https://partyzra-analytics.test/health'),env);
  assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
  const token=Buffer.from('admin:unit-test-secret').toString('base64');
  r=await worker.fetch(new Request('https://partyzra-analytics.test/dashboard'),env);
  assert.equal(r.status,401);
  const excluded = new Request('https://partyzra-analytics.test/track',{method:'POST',headers:{Origin:'https://partyzra.github.io','CF-Connecting-IP':'198.51.100.5'},body:JSON.stringify({event_type:'photo_view',page:'/photography',item:'test.jpg',session_id:'testSession123'})});
  r=await worker.fetch(excluded,env);assert.equal(r.status,202);assert.equal((await r.json()).excluded,true);
  assert.equal(sql('SELECT COUNT(*) AS n FROM events').results[0].n,1);
  r=await worker.fetch(makeEvent('sessionAAA'),env);assert.equal(r.status,202);
  const vid='v1-0123456789abcdef0123456789abcdef';
  for(const sid of ['sessionBBB','sessionCCC']){r=await worker.fetch(makeEvent(sid,vid),env);assert.equal(r.status,202);}
  r=await worker.fetch(makeEvent('sessionDDD','invalidvisitor'),env);assert.equal(r.status,202);
  const rows=sql('SELECT session_id,visitor_id FROM events ORDER BY id').results;
  assert.equal(rows.length,5);
  assert.equal(rows[0].visitor_id,null);
  assert.equal(rows[1].visitor_id,null);
  assert.equal(rows[2].visitor_id,vid);assert.equal(rows[3].visitor_id,vid);
  assert.equal(rows[4].visitor_id,null);
  for(const range of ['today','7d','30d','all']){
   const req=new Request(`https://partyzra-analytics.test/dashboard?range=${range}&activity_size=100`,{headers:{Authorization:'Basic '+token}});
   r=await worker.fetch(req,env);
   const html=await r.text();
   if (r.status !== 200) throw new Error(`${range}: ${r.status} ${html}`);
   if(range==='all') fs.writeFileSync(path.join(root,'dashboard-demo.html'), html.replace('<body><main>', '<body><div style="background:#4b3b26;color:#fff3d9;padding:9px 20px;text-align:center;font:12px system-ui">ILLUSTRATIVE DATA ONLY — NOT YOUR LIVE ANALYTICS</div><main>'));
   assert(html.includes('Behind the <em>visits.</em>'),`visitor section missing ${range}`);
   assert(html.includes('Browser 012345'),`browser history missing ${range}`);
   assert(html.includes('Returned'),`returning classification missing ${range}`);
   assert(html.includes('Recent activity'),`recent activity missing ${range}`);
   console.log(`PASS dashboard ${range}, length ${html.length}`);
  }
  assert.equal(sql('SELECT COUNT(*) AS n FROM events').results[0].n,5);
  console.log('PASS migration preserves history, auth, health, IP exclusion, unlinked, visitor linking');
 } finally {database.close()}
}
main().catch(e=>{console.error(e);process.exit(1)});
