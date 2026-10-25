const script=document.currentScript,page=script?.dataset.page;
if(/^[a-z0-9-]+\.html$/.test(page||'')){
 const target=new URL(page,script.src);target.search=location.search;target.hash=location.hash;
 if(target.origin===location.origin)location.replace(target.href);
}
