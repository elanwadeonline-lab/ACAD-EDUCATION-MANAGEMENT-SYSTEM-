import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const identities={'token-a':{id:1,name:'Amina',email:'amina@test.school',role:'student'},'token-b':{id:2,name:'David',email:'david@test.school',role:'student'},'token-t':{id:3,name:'Teacher',email:'teacher@test.school',role:'teacher'}};
const server=createServer(async(req,res)=>{
 if(req.url==='/api/auth/me'){
  const bearer=req.headers.authorization?.replace(/^Bearer /,'');
  const token=bearer||(req.headers['x-tab-session']==='required'?null:req.headers.cookie?.match(/__exampool_session=([^;]+)/)?.[1]);
  const user=identities[token];res.writeHead(user?200:401,{'Content-Type':'application/json'}).end(JSON.stringify(user?{data:{user}}:{error:'Sign in in this tab'}));return;
 }
 if(req.url==='/tab-api.js'){res.writeHead(200,{'Content-Type':'text/javascript'}).end(await readFile('scratch/tab-api.js'));return;}
 res.writeHead(200,{'Content-Type':'text/html'}).end('<html><body>Tab session verification<script>window.process={env:{NEXT_PUBLIC_API_URL:""}}</script></body></html>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const me=page=>page.evaluate(async()=>{const api=await import('/tab-api.js');return (await api.getSession('student')).user;});
try{
 const a=await browser.newPage();await a.goto(origin+'/test');await a.evaluate(async()=>{const api=await import('/tab-api.js');api.setTabSession('token-a','student','session-a');});assert.equal((await me(a)).id,1);
 await a.setCookie({name:'__exampool_session',value:'token-b',url:origin});
 const b=await browser.newPage();await b.goto(origin+'/test');assert.equal(await me(b),null,'New tab adopted shared student cookie');
 await b.evaluate(async()=>{const api=await import('/tab-api.js');api.setTabSession('token-b','student','session-b');});assert.equal((await me(b)).id,2);assert.equal((await me(a)).id,1);
 await a.reload();assert.equal((await me(a)).id,1,'Refreshing lost the tab session');
 const targetPromise=browser.waitForTarget(target=>target.opener()===a.target());await a.evaluate(url=>window.open(url,'_blank'),origin+'/test');const opened=await (await targetPromise).page();await opened.waitForFunction(()=>location.pathname==='/test');assert.equal(await me(opened),null,'window.open copied the parent login');
 const copied=await a.evaluate(()=>({name:window.name,storage:Object.fromEntries(Object.keys(sessionStorage).map(key=>[key,sessionStorage.getItem(key)]))}));
 const duplicate=await browser.newPage();await duplicate.goto(origin+'/test');await duplicate.evaluate(state=>{window.name=state.name;for(const [key,value] of Object.entries(state.storage))sessionStorage.setItem(key,value);},copied);assert.equal(await me(duplicate),null,'A duplicate claimed the original tab session');assert.equal((await me(a)).id,1);
 await b.evaluate(async()=>{const api=await import('/tab-api.js');api.clearTabSession('student');});assert.equal(await me(b),null);assert.equal((await me(a)).id,1,'Signing out B changed A');
 await opened.evaluate(async()=>{const api=await import('/tab-api.js');api.setTabSession('token-t','teacher','session-t');});const teacher=await opened.evaluate(async()=>{const api=await import('/tab-api.js');return(await api.getSession('teacher')).user;});assert.equal(teacher.id,3);assert.equal((await me(a)).id,1);
 console.log('PASS: two student identities, refresh, shared cookies, window.open, duplicated tab, independent sign-out and another role.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
