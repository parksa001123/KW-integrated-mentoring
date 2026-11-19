import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
declare global {interface Window {google:any;kwCareHtml:string}}
let token='';
const originalFetch=window.fetch.bind(window);
window.fetch=async function(input:any,options:any={}){
 const path=typeof input==='string'?input:input.url;
 if(!path.startsWith('/api/'))return originalFetch(input,options);
 const body=options.body?JSON.parse(options.body):{};
 const request={...body,token,route:path,method:options.method||'GET'};
 const result:any=await new Promise((resolve,reject)=>window.google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).api(request));
 if(result.token)token=result.token;
 if(body.action==='logout')token='';
 return new Response(JSON.stringify(result),{status:result.ok===false?400:200,headers:{'Content-Type':'application/json'}});
};
const observer=new MutationObserver(()=>{
 document.querySelectorAll<HTMLIFrameElement>('iframe.care-frame').forEach(frame=>{
  if(frame.dataset.googleReady)return;
  frame.dataset.googleReady='1';frame.removeAttribute('src');
  frame.srcdoc=window.kwCareHtml;
 });
});
observer.observe(document.body,{subtree:true,childList:true});
createRoot(document.getElementById('root')!).render(<Home/>);
