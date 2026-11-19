import {build} from 'esbuild';
import fs from 'node:fs/promises';
const result=await build({entryPoints:['google-frontend/main.tsx'],bundle:true,write:false,minify:true,jsx:'automatic',format:'iife',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'copy-site-title',setup(build){build.onLoad({filter:/app\/page\.tsx$/},async args=>({contents:(await fs.readFile(args.path,'utf8')).replace('<b>KW<span>integrated-mentoring</span></b>','<b>KW-Integrated-mentoring</b>'),loader:'tsx'}));}}]});
const code=result.outputFiles[0].text;
const css=await fs.readFile('../site/.sites-checkout/dist/client/_next/static/css/index.U54x3VSS.css','utf8');
let care=await fs.readFile('public/care.html','utf8');
// Only the Google copy uses srcdoc. Its location has no usable URL base.
care=care.replace('new URL(SERVER_ENDPOINT,location.origin)', "new URL(SERVER_ENDPOINT,'https://kw-copy.local')");
care=care.replaceAll('location.origin','parent.location.origin');
care=care.replace("if(a.admin){currentToken='session';}", "if(a.admin){currentToken='session';await loadAdminData();document.body.classList.add('logged');logoutBtn.classList.remove('hidden');if(document.getElementById('adminLogin').classList.contains('active'))go('dashboard');}else{currentToken='';document.body.classList.remove('logged');logoutBtn.classList.add('hidden');}");
care=care.replace("function go(id){","function go(id){if(id==='adminLogin'&&currentToken){id='dashboard';loadAdminData().catch(e=>{loginMsg.textContent=e.message;});}");
care=care.replace('<head>','<head><script>window.fetch=(...args)=>parent.fetch(...args);<\/script>');
const html='<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KW-Integrated-mentoring</title><style>'+css+'</style><body><div id="root"></div><script>window.kwCareHtml='+JSON.stringify(care).replaceAll('</script','<\\/script')+';<\/script><script>'+code.replaceAll('</script','<\\/script')+'<\/script></body></html>';
await fs.writeFile('google-backend/FullIndex.html',html);
console.log('Built original React interface, bytes:',Buffer.byteLength(html));
