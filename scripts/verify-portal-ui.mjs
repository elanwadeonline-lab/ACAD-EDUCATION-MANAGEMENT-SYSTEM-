import puppeteer from '../frontend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('frontend/dist'),out=path.resolve('scratch/workflow-ui');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://local').pathname);const file=path.resolve(root,'.'+name+(name.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(404).end();return;}const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,timeout:30000});
const issues=[];
const chatMessages=[{id:1,sender_id:2,sender_role:'guardian',text:'Can we discuss Amina’s progress?',created_at:new Date().toISOString()}];
const communityPost={id:1,author_id:3,author_name:'David C.',author_role:'student',title:'How does reflection work?',body:'Which angle should I measure from the normal?',kind:'question',category:'question',created_at:Date.now(),reply_count:0,reactions:[]};
let communityReplies=[];
async function pageFor(role){
 const page=await browser.newPage();page.on('pageerror',e=>issues.push(e.message));await page.evaluateOnNewDocument(()=>{delete Navigator.prototype.serviceWorker;try{localStorage.setItem('acqad_student_theme','dark');localStorage.setItem('acqad_theme','dark');}catch{}});await page.setRequestInterception(true);
 page.on('request',async req=>{
 const url=new URL(req.url());if(!url.pathname.startsWith('/api/'))return req.continue();let data={};
 if(url.pathname==='/api/auth/me')data={user:{id:role==='guardian'?2:1,name:'QA Teacher',email:'qa@school.test',role}};
 else if(url.pathname==='/api/academic/active')data={activeSession:{id:1,name:'2026/2027',is_active:1},activeTerm:{id:1,session_id:1,name:'First Term',is_active:1}};
 else if(url.pathname==='/api/academic/sessions')data={sessions:[{id:1,name:'2026/2027',is_active:1}],terms:[{id:1,session_id:1,name:'First Term',is_active:1}]};
 else if(url.pathname==='/api/subjects/with-question-counts')data=[{id:7,name:'Physics',code:'PHY',class:'SS 2',duration:60,total_score:50,is_published:1,question_count:12}];
 else if(url.pathname==='/api/guardian/wards')data={wards:[{id:1,student_id:1,name:'Amina Yusuf',grade:'SS 2',reg_id:'QA-1',reports:[{id:'term-1',category:'academic',title:'First Term Report',description:'Approved results',url:'/api/guardian/wards/1/report-card?sessionId=1&termId=1'}]}]};
 else if(url.pathname==='/api/guardian/wards/1/report-card')data={school_name:'Grace College',term_name:'First Term',results:[{subject_name:'Physics',score:30,total_score:50,ca_score:10,exam_score:20,grade:'C'}],remarks:[]};
 else if(url.pathname.includes('notifications'))data={items:[],unreadCount:0};
 else if(/messages\/threads\/1$/.test(url.pathname)){
   if(req.method()==='POST'){const sent={id:chatMessages.length+1,sender_role:role,sender_id:1,text:JSON.parse(req.postData()).text,created_at:new Date().toISOString()};chatMessages.push(sent);data=sent;}
   else data={thread:{id:1,guardian_name:'Guardian One',guardian_id:2,recipient_id:1,student_id:1,student_name:'Amina Yusuf'},messages:chatMessages};
 }
 else if(url.pathname.includes('messages/threads'))data=[{id:1,guardian_name:'Guardian One',guardian_id:2,recipient_id:1,student_id:1,student_name:'Amina Yusuf',last_message:'Can we discuss Amina’s progress?',unread_for_recipient:1}];
 else if(url.pathname==='/api/learning/chat-status')data={is_locked:false};
 else if(url.pathname==='/api/learning/presence')data={count:3};
 else if(url.pathname==='/api/learning/posts')data=[communityPost];
 else if(url.pathname==='/api/learning/posts/1')data={post:communityPost,replies:communityReplies};
 else if(url.pathname==='/api/learning/posts/1/replies'){communityReplies.push({id:communityReplies.length+1,author_id:1,author_name:'Amina',author_role:'student',body:JSON.parse(req.postData()).body,created_at:Date.now(),reactions:[]});data={post:communityPost,replies:communityReplies};}
 else if(url.pathname.includes('/students'))data=[];
 else if(url.pathname==='/api/setup/status')data={setupRequired:true};
 if(url.pathname==='/api/notifications/stream')return req.respond({status:200,contentType:'text/event-stream',body:': connected\n\n'});
 await req.respond({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
 });return page;
}
try{
 const teacher=await pageFor('teacher');await teacher.setViewport({width:1440,height:1000,isMobile:true,hasTouch:true});await teacher.goto(origin+'/teacher/dashboard/',{waitUntil:'networkidle0'});
 const cardSelector='[class*="courseGrid"] > [class*="courseCard"]';await teacher.waitForSelector(cardSelector);
 for(const width of [375,768,1024,1440]){
  await teacher.setViewport({width,height:1000,isMobile:true,hasTouch:true});await teacher.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const result=await teacher.$eval(cardSelector,card=>({width:card.getBoundingClientRect().width,nested:card.querySelectorAll('a button').length,actions:[...card.querySelectorAll('[class*="subjectAction"]')].map(e=>({padding:getComputedStyle(e).padding,border:getComputedStyle(e).borderWidth,radius:getComputedStyle(e).borderRadius})),eye:!!card.querySelector('[aria-label="View Physics results"]')}));
  assert(result.width<=361,`Single subject stretches at ${width}: ${result.width}`);assert.equal(result.nested,0);assert.equal(result.actions.length,3);assert(result.actions.every(a=>JSON.stringify(a)===JSON.stringify(result.actions[0])));assert(result.eye);
  assert.equal(await teacher.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`Horizontal page overflow at ${width}`);
 }
 assert.equal(await teacher.evaluate(()=>document.documentElement.dataset.theme),'light');await teacher.screenshot({path:path.join(out,'teacher-desktop.png'),fullPage:true});
 await teacher.setViewport({width:375,height:1000,isMobile:true,hasTouch:true});await teacher.screenshot({path:path.join(out,'teacher-mobile.png'),fullPage:true});
 for(const [role,url] of [['teacher','/teacher/messages/'],['operator','/ADMIN/messages/']]){
  const chat=await pageFor(role);await chat.setViewport({width:375,height:900,isMobile:true,hasTouch:true});await chat.goto(origin+url,{waitUntil:'networkidle0'});
  await chat.waitForSelector('[class*="threadItem"]');await chat.click('[class*="threadItem"]');await chat.waitForSelector('[aria-label="Reply to parent"],[aria-label="Reply to guardian"]');
  const field='[aria-label="Reply to parent"],[aria-label="Reply to guardian"]';const reply=`${role} confirms the school record is up to date.`;await chat.type(field,reply);
  await chat.evaluate(()=>{const form=document.querySelector('form');const button=form?.querySelector('button[type="submit"]');if(button)button.click();});
  await chat.waitForFunction(text=>document.body.innerText.includes(text),{},reply);assert.equal(await chat.$eval(field,e=>e.value),'');
  assert.equal(await chat.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await chat.screenshot({path:path.join(out,`${role}-chat-mobile.png`)});
 }
 const student=await pageFor('student');await student.setViewport({width:375,height:900,isMobile:true,hasTouch:true});await student.goto(origin+'/student/community/',{waitUntil:'networkidle0'});await student.waitForFunction(()=>document.body.innerText.includes('How does reflection work?'));
 assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await student.evaluate(()=>document.documentElement.dataset.theme),'dark');await student.screenshot({path:path.join(out,'student-community-mobile.png'),fullPage:true});
 await student.goto(origin+'/student/community/?thread=1',{waitUntil:'networkidle0'});await student.waitForSelector('[aria-label="Your reply"]');await student.type('[aria-label="Your reply"]','Measure both angles from the normal.');await student.click('button[type="submit"]');await student.waitForFunction(()=>document.body.innerText.includes('Measure both angles from the normal.'));await student.screenshot({path:path.join(out,'student-thread-mobile.png'),fullPage:true});
 const guardian=await pageFor('guardian');await guardian.setViewport({width:375,height:900,isMobile:true,hasTouch:true});await guardian.goto(origin+'/guardian/reports/?view=term-1',{waitUntil:'networkidle0'});await guardian.waitForSelector('table');const report=await guardian.evaluate(()=>document.body.innerText);assert(report.includes('Grace College'));assert(report.includes('60%'));assert(!/EXAMPOOL HIGH SCHOOL|Powered by ExamPool/.test(report));await guardian.screenshot({path:path.join(out,'guardian-report-mobile.png'),fullPage:true});
 const setup=await pageFor('operator');await setup.setViewport({width:375,height:900,isMobile:true,hasTouch:true});await setup.goto(origin+'/setup/',{waitUntil:'networkidle0'});await setup.waitForSelector('#school-name');await setup.type('#school-name','Grace College');await setup.type('#admin-name','School Administrator');await setup.type('#admin-email','admin@grace.test');await setup.click('form button[type="submit"]');await setup.waitForSelector('#admin-password');assert.equal(await setup.$eval('#admin-password',e=>e.minLength),8);assert((await setup.evaluate(()=>document.body.innerText)).includes('Acqad'));assert.equal(await setup.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await setup.screenshot({path:path.join(out,'setup-mobile.png'),fullPage:true});
 assert.deepEqual(issues,[]);console.log('PASS: responsive subject cards, teacher/admin mobile chat, student community and reply in dark mode, report data and setup journey.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
