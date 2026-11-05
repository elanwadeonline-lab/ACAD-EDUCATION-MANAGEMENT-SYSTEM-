/* Isolated UI fixtures: API requests never reach school records. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const puppeteer=require('../frontend/node_modules/puppeteer-core');
const origin=process.env.UI_TEST_URL||'http://127.0.0.1:3101';
const output=path.resolve('scratch/ui-reference');
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await puppeteer.launch({pipe:true,headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--disable-gpu','--no-first-run']});
 const posts=[],replies=[],notes=[]; const resources=[{id:1,subject_id:1,teacher_id:3,title:"Working with fractions",body:"Find a common denominator, then add the numerators.",kind:"lesson",state:"published",subject_name:"Mathematics",teacher_name:"Mrs Yusuf",class:"SS2",term:"First Term",external_url:"",files:[],opened_at:null,completed_at:null}];let uploaded=false,joined=false;const errors=[];
 try{
  async function surface(role){
   const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
   await page.evaluateOnNewDocument(()=>{delete Object.getPrototypeOf(navigator).serviceWorker;});await page.setBypassServiceWorker(true);await page.setRequestInterception(true);
   const id=role==='student'?1:role==='teacher'?3:4;
   await page.setCookie({name:`__exampool_session_${role}`,value:`fixture.${Buffer.from(JSON.stringify({role,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture`,url:origin});
   page.on('pageerror',e=>{errors.push(e.message);console.log('Browser error:',e.message);});
   page.on('request',async req=>{
    const url=new URL(req.url()),p=url.pathname;if(!p.startsWith('/api/'))return req.continue();
    let data=[],status=200;const body=()=>JSON.parse(req.postData()||'{}');
    if(p==='/api/auth/me')data={user:{id,role,name:role==='student'?'Amina Yusuf':'School team',email:'fixture@test.invalid',grade:'SS2',reg_id:'TEST',is_class_teacher:true}};
    else if(p==='/api/config')data={school_name:'Acqad School'};
    else if(p==='/api/academic/active')data={activeSession:{id:1,name:'2026/2027'},activeTerm:{id:1,name:'First Term'}};
    else if(p==='/api/academic/sessions')data={sessions:[],terms:[]};
    else if(p==='/api/learning/presence')data={count:2};
    else if(p==='/api/learning/posts'&&req.method()==='POST'){const post={...body(),id:posts.length+1,author_id:id,author_name:'Amina Yusuf',author_role:role,created_at:Date.now(),reply_count:0,resolved:0};posts.unshift(post);data={post,replies:[]};}
    else if(p==='/api/learning/posts')data=posts;
    else if(/^\/api\/learning\/posts\/\d+/.test(p)){const post=posts.find(x=>x.id===Number(p.split('/')[4]));if(p.endsWith('/replies')){replies.push({id:1,author_name:'Amina Yusuf',author_role:role,body:body().body,created_at:Date.now()});post.reply_count=replies.length;}if(p.endsWith('/moderate'))post.resolved=1;data={post,replies};}
    else if(p==='/api/learning/subjects')data=[{id:1,name:'Mathematics',class:'SS2',term:'First Term',session:'2026/2027'}];
    else if(p==='/api/learning/files'){assert(!req.headers()['content-type']?.includes('application/json'),'multipart upload must not use JSON content type');uploaded=true;data={id:1,filename:'lesson.pdf',mime:'application/pdf',bytes:22};}
    else if(p==='/api/learning/notes'&&req.method()==='POST'){const note={...body(),id:1,teacher_id:3,teacher_name:'Mrs Yusuf',subject_name:'Mathematics',class:'SS2',term:'First Term',session:'2026/2027',updated_at:Date.now(),feedback:'',files:uploaded?[{id:1,filename:'lesson.pdf',mime:'application/pdf',bytes:22}]:[]};notes.push(note);data={id:1};}
    else if(p==='/api/learning/notes'){if(role==='student'){status=403;data=[];}else data=notes;}
    else if(p==='/api/learning/library')data=resources;
    else if(p.endsWith('/progress')){const action=body().action;resources[0].opened_at=Date.now();if(action!=='open')resources[0].completed_at=action==='complete'?Date.now():null;data={ok:true};}
    else if(p.endsWith('/review')){notes[0].state=body().state;data={ok:true};}
    else if(p==='/api/arena/join'){joined=true;data={id:'fixture'};}
    return req.respond({status,contentType:'application/json',body:JSON.stringify({data})});
   });
   return page;
  }
  async function click(page,text){await page.waitForFunction(text=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===text),{polling:100},text);await page.evaluate(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text).click(),text);}
  async function text(page,value){try{await page.waitForFunction(value=>document.body.innerText.includes(value),{polling:100},value);}catch(e){console.log('Expected:',value,'Page:',await page.$eval('body',el=>el.innerText));await page.screenshot({path:path.join(output,'learning-ui-failure.png'),fullPage:true});throw e;}}
  async function capture(page,name){await new Promise(resolve=>setTimeout(resolve,350));await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow');}
  const student=await surface('student');await student.goto(origin+'/student/community/',{waitUntil:'networkidle2'});await text(student,'Be the first to ask');await click(student,'Ask the community');
  await student.type('input[maxlength="140"]','How do fractions add up?');await student.type('textarea','I tried adding the denominators. What should I do instead?');await click(student,'Post to community');await text(student,'Replies · 0');
  await student.type('textarea','Try a common denominator.');await click(student,'Post reply');await text(student,'Replies · 1');await capture(student,'learning-student-thread');
  await student.setViewport({width:320,height:844});await capture(student,'learning-student-thread-320');
  await student.evaluate(()=>document.documentElement.setAttribute('data-theme','dark'));await capture(student,'learning-student-dark-320');
  const teacher=await surface('teacher');await teacher.goto(origin+'/teacher/lesson-notes/',{waitUntil:'networkidle2'});await click(teacher,'Write a lesson note');
  await teacher.type('input[maxlength="160"]','Adding fractions');await teacher.type('textarea','Objectives: find a common denominator and add fractions.');
  const file=path.join(output,'lesson.pdf');fs.writeFileSync(file,'%PDF-1.4\nfixture\n%%EOF');await (await teacher.$('input[type=file]')).uploadFile(file);await text(teacher,'Remove attachment');
  await capture(teacher,'learning-teacher-note-editor');await click(teacher,'Submit to admin');await text(teacher,'Download attachment');assert.equal(notes[0].state,'submitted');
  const admin=await surface('operator');await admin.goto(origin+'/ADMIN/lesson-notes/',{waitUntil:'networkidle2'});await click(admin,'Adding fractions');await text(admin,'Review this submission');await capture(admin,'learning-admin-review');await click(admin,'Approve lesson note');await admin.waitForFunction(()=>!document.body.innerText.includes('Review this submission'));
  await teacher.reload({waitUntil:'networkidle2'});await text(teacher,'Approved');assert(!await teacher.$('button[value=published]'));await teacher.goto(origin+'/teacher/learning-library/',{waitUntil:'networkidle2'});await click(teacher,'Add learning material');await capture(teacher,'learning-material-editor');await teacher.setViewport({width:390,height:844});await capture(teacher,'learning-material-editor-390');
  await student.goto(origin+'/student/library/',{waitUntil:'networkidle2'});await text(student,'0 of 1 materials completed');assert.equal(await student.$$eval('a[href*="lesson-notes"]',els=>els.length),0);await click(student,'Working with fractions');await text(student,'Find a common denominator');await click(student,'Mark as completed');await text(student,'Mark as still learning');await capture(student,'learning-student-library-320');await click(student,'← Learning library');await text(student,'1 of 1 materials completed');await student.reload({waitUntil:'networkidle2'});await text(student,'1 of 1 materials completed');await capture(student,'learning-student-library-progress-320');
  assert(uploaded);assert.equal(notes[0].state,'approved');assert.deepEqual(errors,[]);console.log('PASS: discussion post/reply, responsive dark layout, teacher PDF submission, admin approval, private teacher notes, and persistent student resource progress.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
