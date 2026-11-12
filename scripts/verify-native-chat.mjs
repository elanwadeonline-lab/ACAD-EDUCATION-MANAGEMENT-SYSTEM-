import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import {createServer} from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve('apps/mobile-guardian/dist-review');await mkdir('scratch/native-chat',{recursive:true});
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://qa').pathname).replace(/^\/mobile(?=\/|$)/,'');if(!name)name='/';let file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(404).end();return;}try{if(!path.extname(file))file=path.join(root,'index.html');const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let failSend=false;const messages=[{id:1,sender_id:10,sender_role:'teacher',text:'Hello, Amina’s attendance has been recorded.',created_at:'2026-11-11T08:00:00Z'}];
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.evaluateOnNewDocument(()=>{try{localStorage.setItem('acqad.guardian.session',JSON.stringify({token:'native-qa-token',server:location.origin}));}catch{}});
await page.setRequestInterception(true);page.on('request',async req=>{
 const url=new URL(req.url());if(!url.pathname.startsWith('/api/'))return req.continue();let data={},status=200;
 if(url.pathname==='/api/auth/me')data={user:{id:2,name:'Parent',email:'parent@test.school',role:'guardian'}};
 else if(url.pathname==='/api/guardian/wards')data={wards:[{id:1,student_id:1,name:'Amina Yusuf',grade:'SS 2',reg_id:'QA-1'}]};
 else if(url.pathname==='/api/guardian/messages/threads/1'){
  if(req.method()==='POST'){if(failSend){status=503;data={error:'Connection interrupted. Your draft is kept.'};}else{const body=JSON.parse(req.postData());messages.push({id:messages.length+1,sender_id:2,sender_role:'guardian',text:body.text,created_at:new Date().toISOString()});}}
  if(status===200)data={thread:{id:1,student_id:1,student_name:'Amina Yusuf'},messages};
 }
 else if(url.pathname==='/api/guardian/messages/threads')data=[{id:1,recipient_name:'Class teacher',recipient_role:'teacher',student_id:1,student_name:'Amina Yusuf',category:'teacher',last_message:messages.at(-1).text,last_message_at:new Date().toISOString()}];
 else if(url.pathname==='/api/guardian/messages/contacts')data=[{id:10,name:'Class teacher',role:'teacher',role_label:'Class teacher',category:'teacher',student_id:1}];
 await req.respond({status,contentType:'application/json',body:JSON.stringify(status===200?{success:true,data}:{error:data.error})});
});
try{
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 await page.goto(origin+'/mobile/messages/1?name=Class%20teacher&role=Teacher&studentName=Amina%20Yusuf',{waitUntil:'networkidle0',timeout:120000});
 await page.waitForSelector('[aria-label="Message to school"]',{timeout:60000});await page.waitForFunction(()=>document.body.innerText.includes('attendance has been recorded'));
 await page.type('[aria-label="Message to school"]','Thank you for the update.');await page.click('[aria-label="Send message"]');await page.waitForFunction(()=>document.body.innerText.includes('Thank you for the update.'));assert.equal(await page.$eval('[aria-label="Message to school"]',e=>e.value),'');
 failSend=true;await page.type('[aria-label="Message to school"]','Please confirm the next test date.');await page.click('[aria-label="Send message"]');await page.waitForFunction(()=>document.body.innerText.includes('Could not send'));assert.equal(await page.$eval('[aria-label="Message to school"]',e=>e.value),'Please confirm the next test date.');assert((await page.evaluate(()=>document.body.innerText)).includes('Thank you for the update.'));
 failSend=false;await page.click('[aria-label="Send message"]');await page.waitForFunction(()=>document.querySelector('[aria-label="Message to school"]').value==='');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'scratch/native-chat/conversation.png'});assert.deepEqual(errors,[]);
 console.log('PASS: actual native guardian conversation preview, readable messages, send/retry, preserved draft and no horizontal overflow.');
}catch(e){console.log('Native preview:',await page.evaluate(()=>document.body.innerText.slice(0,1800)),errors);await page.screenshot({path:'scratch/native-chat/failure.png'});throw e;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
