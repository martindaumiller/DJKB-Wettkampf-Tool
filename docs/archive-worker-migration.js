// Retire the superseded SDM archive worker without touching tournament data or other caches.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await self.clients.claim();
  const oldPrefix=new URL('./',self.location.href).pathname;
  const newPrefix=oldPrefix.replace(/archiv-2026\/$/,'archiv-2026-v2/');
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  await Promise.allSettled(windows.filter(client=>new URL(client.url).origin===self.location.origin&&new URL(client.url).pathname.startsWith(oldPrefix)).map(client=>{
    const target=new URL(client.url);target.pathname=newPrefix+target.pathname.slice(oldPrefix.length);return client.navigate(target.href);
  }));
  await self.registration.unregister();
})()));
