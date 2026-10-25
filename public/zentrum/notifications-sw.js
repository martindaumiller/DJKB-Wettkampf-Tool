self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let data;try{data=event.data?.json();}catch{}if(!data?.title||!data?.body)return;
 const url=new URL(data.url||'index.html#notify',self.registration.scope);if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.waitUntil(self.registration.showNotification(String(data.title).slice(0,150),{body:String(data.body).slice(0,600),tag:String(data.tag||'sdm-call'),icon:'../assets/mark.svg',badge:'../assets/mark.svg',renotify:true,data:{url:url.href},timestamp:Date.now()}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=new URL(event.notification.data?.url||'index.html#notify',self.registration.scope);if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=windows.find(c=>c.url.startsWith(self.registration.scope));if(client){await client.navigate(url.href);await client.focus();}else await self.clients.openWindow(url.href);})());
});
