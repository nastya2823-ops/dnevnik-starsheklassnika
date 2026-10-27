'use strict';
let installPrompt=null, offlineReady=false, offlineState='loading';
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
function mobileTabs(){
  const tabs=[['home','Главная','home'],['navigator','Навигатор','compass'],['goals','Цели','target'],['iot','Маршрут','route']];
  return `<nav class="mobile-tabs" aria-label="Меню приложения">${tabs.map(([id,label,i])=>`<a href="#${id}" class="mobile-tab ${view===id?'active':''}" ${view===id?'aria-current="page"':''}>${icon(i)}<span>${label}</span></a>`).join('')}<button class="mobile-tab ${['resources','self'].includes(view)?'active':''}" data-mobile-action="more" aria-label="Ещё разделы">${icon('layers')}<span>Ещё</span></button></nav>`;
}
function installCard(){return `<section class="install-card"><div class="install-art">${icon('book')}<span>✦</span></div><div><h2>${standalone()?'Дневник всегда рядом':'Твой дневник — с собой'}</h2><p>${standalone()?'Цели, открытия и заметки в твоём темпе.':'Добавь на главный экран и открывай одним касанием.'}</p></div><button class="icon-button" data-mobile-action="install" aria-label="Установка и офлайн-режим">${icon(standalone()?'check':'arrowup')}</button></section>`;}
function connectionText(){return navigator.onLine?'Есть подключение':'Без интернета · записи сохраняются на устройстве';}
function enhanceMobile(){
 if($('.workspace')){
   if(!$('.mobile-tabs'))$('.workspace').insertAdjacentHTML('beforeend',mobileTabs());
   if(!$('.connection-strip'))$('.topbar').insertAdjacentHTML('afterend',`<div class="connection-strip" role="status" ${navigator.onLine?'hidden':''}>${icon('shield')}<span>${connectionText()}</span></div>`);
 }
 const homeHead=$('.content .page-head');
 if(view==='home'&&homeHead&&!$('.install-card'))homeHead.insertAdjacentHTML('afterend',installCard());
 if($('.landing-footer')&&!$('.landing-install'))$('.landing-footer').insertAdjacentHTML('beforebegin',`<div class="landing-install"><button class="text-button" data-mobile-action="install">${icon('download')}Установить на телефон</button><span>Твой путь всегда под рукой</span></div>`);
 if(!$('.install-desktop')&&$('.sidebar-bottom'))$('.sidebar-bottom').insertAdjacentHTML('afterbegin',`<button class="nav-link install-desktop" data-mobile-action="install">${icon('download')}Установить приложение</button>`);
 document.documentElement.classList.toggle('app-standalone',standalone());
}
function moreMenu(){
 dialog.classList.add('mobile-menu-dialog');
 openDialog(`${dialogHead('Твой дневник')}<p class="dialog-description">Всё важное — в одном месте.</p><div class="more-grid">${nav.map(([id,label,i])=>`<a href="#${id}" class="more-link ${view===id?'active':''}">${icon(i)}<span>${label}</span>${icon('arrow')}</a>`).join('')}</div><div class="divider"></div><button class="more-link" data-mobile-action="install">${icon('download')}<span>Установка и офлайн-режим</span>${icon('arrow')}</button><button class="more-link" data-mobile-action="profile">${icon('shield')}<span>Профиль и резервная копия</span>${icon('arrow')}</button>`);
}
function installHelp(){
 dialog.classList.remove('mobile-menu-dialog');
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 openDialog(`<div class="dialog-intro-icon">${icon('book')}</div>${dialogHead(standalone()?'Приложение на устройстве':'Дневник на твоём телефоне')}<p class="dialog-description">Личный дневник с отдельной иконкой и удобным мобильным меню.</p>${standalone()?`<div class="notice">Ты уже открываешь дневник как приложение.</div>`:`${installPrompt?`<button class="button" style="width:100%;margin-bottom:20px" data-mobile-action="native-install">${icon('download')}Установить приложение</button>`:''}<div class="install-steps"><h3>${ios?'На iPhone или iPad':'На iPhone'}</h3><ol><li>Открой адрес своего дневника в <b>Safari</b>.</li><li>Нажми <b>«Поделиться»</b> и выбери <b>«На экран „Домой“»</b>.</li><li>Если есть переключатель <b>«Открывать как веб-приложение»</b>, оставь его включённым и нажми <b>«Добавить»</b>.</li></ol>${!ios?`<h3>На Android</h3><p>Открой дневник в Chrome. В меню браузера выбери «Установить приложение» или «Добавить на главный экран».</p>`:''}</div>`}<section class="offline-status ${offlineReady?'ready':''}">${icon(offlineReady?'check':'clock')}<div><b>${offlineReady?'Готов к работе без интернета':offlineState==='unsupported'?'Офлайн недоступен в этом окне':offlineState==='error'?'Офлайн-режим не загрузился':'Офлайн-режим ещё не готов'}</b><p>${offlineReady?'Страницы и встроенные материалы загружены. Цели и заметки сохраняются на этом устройстве.':offlineState==='unsupported'?'Открой дневник по защищённой ссылке в Safari или Chrome.':offlineState==='error'?'Проверь подключение, затем открой дневник заново. Записи на устройстве сохраняются.':'Оставь приложение открытым с интернетом. Статус изменится после полной загрузки.'}</p></div></section><p class="hint">Данные Safari и установленного приложения могут храниться отдельно — для переноса используй резервную копию. Установка на телефон требует размещения на HTTPS.</p><div class="dialog-footer"><button class="button" data-action="close-dialog">Понятно ${icon('check')}</button></div>`);
}
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-mobile-action]');if(!el)return;
 switch(el.dataset.mobileAction){
 case'more':moreMenu();break;
 case'install':installHelp();break;
 case'profile':closeDialog();profile();break;
 case'native-install':if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;closeDialog();}break;
 }
});
dialog.addEventListener('close',()=>dialog.classList.remove('mobile-menu-dialog'));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
window.addEventListener('appinstalled',()=>{installPrompt=null;toast('Дневник добавлен на устройство');});
function updateNetwork(){const bar=$('.connection-strip');if(bar){bar.hidden=navigator.onLine;bar.querySelector('span').textContent=connectionText();}}
window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);
// Add the mobile controls after every application render without changing stored data.
const mobileObserver=new MutationObserver(enhanceMobile);
mobileObserver.observe(app,{childList:true});
enhanceMobile();
if(window.visualViewport){const updateKeyboard=()=>document.documentElement.classList.toggle('keyboard-open',window.innerHeight-window.visualViewport.height>150);window.visualViewport.addEventListener('resize',updateKeyboard);}
function queryCacheStatus(worker){return new Promise(resolve=>{if(!worker)return resolve(false);const channel=new MessageChannel();const timer=setTimeout(()=>resolve(false),4000);channel.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data?.ready===true);channel.port1.close();};worker.postMessage({type:'DIARY_CACHE_STATUS'},[channel.port2]);});}
async function setupOffline(){
 if(!('serviceWorker' in navigator)||!window.isSecureContext){offlineState='unsupported';return;}
 try{
   const baseURL=new URL('./',document.baseURI);
   const registration=await navigator.serviceWorker.register(new URL('sw.js',baseURL),{scope:baseURL.href,updateViaCache:'none'});
   let timeout;const ready=await Promise.race([navigator.serviceWorker.ready,new Promise((resolve,reject)=>{timeout=setTimeout(()=>reject(new Error('Offline setup timeout')),20000);})]);clearTimeout(timeout);
   offlineReady=await queryCacheStatus(ready.active);offlineState=offlineReady?'ready':'error';
   const check=async()=>{offlineReady=await queryCacheStatus(registration.active);offlineState=offlineReady?'ready':'error';if(dialog.open&&$('.offline-status'))installHelp();};
   navigator.serviceWorker.addEventListener('controllerchange',check);
   if(dialog.open&&$('.offline-status'))installHelp();
 }catch(error){offlineReady=false;offlineState='error';if(dialog.open&&$('.offline-status'))installHelp();}
}
setupOffline();
