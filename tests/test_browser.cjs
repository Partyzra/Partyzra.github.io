const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const src = fs.readFileSync(path.join(__dirname,'../portfolio/js/analytics.js'),'utf8');
function boot(opt={}) {
 const stored=new Map(Object.entries(opt.storage||{}));
 const session=new Map();
 const sent=[];
 const localStorage={ getItem:key=>stored.has(key)?stored.get(key):null, setItem:(key,value)=>stored.set(key,String(value)), removeItem:key=>stored.delete(key) };
 const sessionStorage={getItem:key=>session.has(key)?session.get(key):null,setItem:(key,value)=>session.set(key,String(value))};
 const document={title:'Photography',visibilityState:'hidden',referrer:'',addEventListener:()=>{}};
 const location={pathname:'/photography-content.html',hostname:'partyzra.github.io',protocol:'https:',origin:'https://partyzra.github.io',search: opt.search || ''};
 const win={PORTFOLIO_ANALYTICS_CONFIG:{provider:'partyzra-custom',endpoint:'https://partyzra-analytics.12rparker.workers.dev/track'}, addEventListener:()=>{}};
 win.parent=win;
 const sandbox={window:win,document,location,localStorage,sessionStorage,crypto:webcrypto,URLSearchParams,setTimeout:()=>1,clearTimeout:()=>{},fetch:(_url,request)=>{sent.push(JSON.parse(request.body));return Promise.resolve({ok:true})}};
 vm.runInNewContext(src,sandbox,{filename:'analytics.js'});
 return {win,stored,sent};
}
{
 const a=boot();
 assert.equal(a.stored.get('partyzra_returning_visitor_id'),undefined);
 a.win.PortfolioAnalytics.trackPhotoView({file:'NewPhoto.jpg',title:'New Photo'});
 assert.equal(a.sent.length,2);
 assert(!('visitor_id' in a.sent[0])); assert(!('visitor_id' in a.sent[1]));
}
{
 const a=boot({storage:{partyzra_returning_consent:'yes'}});
 a.win.PortfolioAnalytics.trackPhotoView({file:'Original.jpg',title:'Original'});
 assert.equal(a.sent.length,2);
 const id=a.sent[0].visitor_id;
 assert(/^v1-[a-f0-9]{32}$/.test(id));
 assert.equal(a.sent[1].visitor_id,id);
 assert.equal(a.stored.get('partyzra_returning_visitor_id'),id);
}
{
 const a=boot({storage:{partyzra_returning_consent:'no'}});
 a.win.PortfolioAnalytics.trackEvent('album_select','Animals');
 assert.equal(a.sent.length,2);
 assert(!a.sent.some(e=>'visitor_id' in e));
 assert.equal(a.stored.get('partyzra_returning_visitor_id'),undefined);
}
{
 const a=boot({storage:{partyzra_returning_consent:'yes',partyzra_returning_visitor_id:'v1-0123456789abcdef0123456789abcdef'},search:'?analytics=off'});
 a.win.PortfolioAnalytics.trackPhotoView({file:'NoTrack.jpg'});
 assert.equal(a.sent.length,0);
 assert.equal(a.stored.get('partyzra_returning_visitor_id'),undefined);
 assert.equal(a.stored.get('partyzra_returning_consent'),'no');
}

{
 const a=boot({storage:{partyzra_returning_consent:'yes'}});
 a.win.PortfolioAnalytics.trackPhotoView({file:'Open.jpg'});
 const one=a.sent[1].visitor_id;
 const b=boot({storage:Object.fromEntries(a.stored)});
 b.win.PortfolioAnalytics.trackPhotoView({file:'NextDay.jpg'});
 assert.equal(b.sent[1].visitor_id,one, 'A new browsing session must reuse the consented browser ID');
 assert.notEqual(b.sent[1].session_id,a.sent[1].session_id, 'Each new session gets a separate session ID');
}
console.log('PASS opt-in, opt-out, declined recognition, photo filenames and no pre-consent stable ID');
