export function resolveResource(path,base=import.meta.url){
 const url=new URL(path,base);
 if(/^(?:\.\/)?(?:api\/|notifications-sw\.js|notfall\.php)/.test(path))url.pathname=url.pathname.replace(/\/releases\/[a-zA-Z0-9_-]+\//,'/');
 return url.href;
}
export const resourceURL=path=>resolveResource(path);
export const centerURL=path=>new URL(path,new URL('../',resolveResource('api/',import.meta.url))).href;
