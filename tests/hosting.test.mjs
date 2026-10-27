import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const code=await readFile(new URL('../sw.js',import.meta.url),'utf8');
const origin='https://diary.test';
function harness(base){
  const handlers={},stores=new Map();
  const key=v=>new URL(typeof v==='string'?v:v.url,origin).href;
  const caches={
    async open(name){if(!stores.has(name))stores.set(name,new Map());const entries=stores.get(name);return {
      async put(request,response){entries.set(key(request),response.clone());},
      async match(request){return entries.get(key(request))?.clone();}
    };},
    async keys(){return [...stores.keys()];},
    async delete(name){return stores.delete(name);}
  };
  let network=async request=>{
    const path=new URL(request.url||request,origin).pathname;
    assert.ok(path.startsWith(base),'asset must remain inside the project');
    const filename=path===base?'index.html':path.slice(base.length);
    const body=await readFile(new URL('../'+filename,import.meta.url));
    const mime=filename.endsWith('.html')?'text/html':filename.endsWith('.css')?'text/css':filename.endsWith('.js')?'application/javascript':filename.endsWith('.png')?'image/png':'application/manifest+json';
    return new Response(body,{headers:{'content-type':mime}});
  };
  const self={location:{origin,href:origin+base+'sw.js'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,handler)=>handlers[name]=handler};
  vm.runInNewContext(code,{self,caches,URL,Request,Response,Set,Promise,fetch:r=>network(r)});
  return {
    stores,caches,setNetwork(fn){network=fn;},
    async install(){let result;handlers.install({waitUntil:p=>result=p});return result;},
    async activate(){let result;handlers.activate({waitUntil:p=>result=p});return result;},
    fetch(path,mode='navigate',method='GET'){let result;handlers.fetch({request:{url:new URL(path,origin).href,method,mode},respondWith:p=>result=p});return result;},
    async ready(){let response,done;handlers.message({data:{type:'DIARY_CACHE_STATUS'},ports:[{postMessage:v=>response=v}],waitUntil:p=>done=p});await done;return response.ready;}
  };
}

for(const base of ['/', '/dnevnik-starsheklassnika/']){
  test(base+' loads a full offline application including scripts and icons',async()=>{
    const h=harness(base);await h.install();assert.equal(await h.ready(),true);
    h.setNetwork(async()=>{throw Error('offline');});
    assert.match(await (await h.fetch(base)).text(),/name="diary-app-shell"/);
    assert.match(await (await h.fetch(base+'app.js','same-origin')).text(),/student-diary:v1/);
    assert.equal((await h.fetch(base+'icons/icon-192.png','same-origin')).headers.get('content-type'),'image/png');
  });
  test(base+' honors online errors rather than substituting cached content',async()=>{
    const h=harness(base);await h.install();h.setNetwork(async()=>new Response('Access denied',{status:403}));
    assert.equal((await h.fetch(base)).status,403);
  });
  test(base+' rejects login pages and incomplete offline copies',async()=>{
    const h=harness(base);h.setNetwork(async()=>new Response('<h1>Sign in</h1>',{headers:{'content-type':'text/html'}}));
    await assert.rejects(h.install(),/App resource unavailable/);assert.equal(h.stores.size,0);assert.equal(await h.ready(),false);
  });
  test(base+' reports first-load offline failure accurately',async()=>{
    const h=harness(base);h.setNetwork(async()=>{throw Error('offline');});
    const response=await h.fetch(base);assert.equal(response.status,503);assert.match(await response.text(),/Первая загрузка ещё не завершена/);
  });
  test(base+' excludes other projects, authentication and writes',()=>{
    const h=harness(base);
    assert.equal(h.fetch('/another-project/app.js','same-origin'),undefined);
    assert.equal(h.fetch(base+'login'),undefined);
    assert.equal(h.fetch('https://other.test'+base),undefined);
    assert.equal(h.fetch(base,'navigate','POST'),undefined);
  });
  test(base+' updates only the offline cache belonging to this project',async()=>{
    const h=harness(base);
    const ownOld='student-diary-pages:'+base+':v0';
    const other='student-diary-pages:/another-project/:v0';
    await h.caches.open(ownOld);await h.caches.open(other);await h.install();await h.activate();
    assert.equal(h.stores.has(ownOld),false);assert.equal(h.stores.has(other),true);assert.equal(await h.ready(),true);
  });
  test(base+' resolves HTML and install links inside the project',async()=>{
    const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
    const paths=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]).filter(x=>!x.startsWith('#')&&!x.startsWith('data:'));
    const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
    paths.push(manifest.id,manifest.start_url,manifest.scope,...manifest.icons.map(x=>x.src),...manifest.shortcuts.flatMap(x=>[x.url,...x.icons.map(i=>i.src)]));
    for(const path of paths){
      const url=new URL(path,origin+base);assert.ok(url.pathname.startsWith(base),path);
      if(url.pathname!==base)await readFile(new URL('../'+url.pathname.slice(base.length),import.meta.url));
    }
  });
}
