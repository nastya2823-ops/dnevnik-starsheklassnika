'use strict';
const BASE = new URL('./',self.location.href);
const CACHE_PREFIX = 'student-diary-pages:'+BASE.pathname+':';
const CACHE = CACHE_PREFIX+'v1';
const FILES = [
  ['./', 'text/html'],
  ['./style.css?v=mobile2', 'text/css'],
  ['./app.js', 'javascript'],
  ['./mobile.js', 'javascript'],
  ['./manifest.webmanifest', 'json'],
  ['./icons/icon-192.png', 'image/png'],
  ['./icons/icon-512.png', 'image/png'],
  ['./icons/icon-maskable-512.png', 'image/png'],
  ['./icons/apple-touch-icon.png', 'image/png']
].map(([path,type])=>[new URL(path,BASE).href,type]);
const APP_DOCUMENT = FILES[0][0];
const PATHS = new Set(FILES.map(([path])=>new URL(path).pathname));
async function isAppResponse(response, type, document=false) {
  if(!response.ok || response.redirected || response.type==='opaque') return false;
  const mime=response.headers.get('content-type')||'';
  if(type==='json' ? !/json/.test(mime) : !mime.includes(type)) return false;
  return !document || (await response.clone().text()).includes('name="diary-app-shell"');
}
async function prepareCache(){
  const cache=await caches.open(CACHE);
  // Only fixed application files are stored. Login pages and account routes are excluded.
  for(const [path,type] of FILES){
    const request=new Request(path,{credentials:'same-origin',cache:'reload'});
    const response=await fetch(request);
    if(!await isAppResponse(response,type,path===APP_DOCUMENT))throw new Error('App resource unavailable: '+path);
    await cache.put(path,response);
  }
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  try{await prepareCache();await self.skipWaiting();}
  catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(CACHE_PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    // Online access decisions always win, including sign-in redirects and access denials.
    try{return await fetch(request);}
    catch(error){
      const key=request.mode==='navigate'?APP_DOCUMENT:url.href;
      const cached=await cache.match(key);
      if(cached)return cached;
      if(request.mode==='navigate')return new Response('<!doctype html><html lang="ru"><meta name="viewport" content="width=device-width"><title>Нужен интернет</title><body><h1>Открой дневник с интернетом</h1><p>Первая загрузка ещё не завершена. Подключись к сети и повтори попытку.</p></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
      throw error;
    }
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type!=='DIARY_CACHE_STATUS'||!event.ports[0])return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const checks=await Promise.all(FILES.map(([path])=>cache.match(path)));
    event.ports[0].postMessage({ready:checks.every(Boolean),version:CACHE});
  })());
});
