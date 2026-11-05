/* Visual/interaction fixtures only. Every /api request is intercepted; no school data is changed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../frontend/node_modules/puppeteer-core');
const origin = process.env.UI_TEST_URL || 'http://127.0.0.1:3101';
const output = path.resolve('scratch/ui-reference');
const session = {id:1,name:'2026/2027',is_active:1,status:'active'};
const term = {id:1,session_id:1,name:'First Term',is_active:1,status:'active'};
const names = ['Mathematics','English language','Biology','Chemistry'];
const subjects = names.map((name,i)=>({id:i+1,name,code:['MAT','ENG','BIO','CHE'][i],teacher_id:10,is_published:1,total_score:100,term:'First Term',mode:'exam',question_count:24,exam_datetime:i<3?'2026-01-01T10:00:00Z':new Date(Date.now()+86400000).toISOString(),window_duration:60}));
const results = [0,1].map((i)=>({id:i+1,subject_id:i+1,subject_name:names[i],student_user_id:20,student_name:'Amina Yusuf',score:[82,76][i],total_score:100,status:'completed',exam_status:'completed',is_result_released:true,result_status:'released',end_time:`2026-10-${21+i*3}T10:00:00Z`}));
const telemetry={streak:4,bestStreak:6,todayQuestions:8,dailyGoal:10,practicePercent:80,rank:3,cohortTotal:28,cohortName:'SS2',xp:1240,level:3,levelTitle:'Scholar',nextLevelXp:1500,xpToNext:260,levelProgressPct:65,pointsBreakdown:{examScorePoints:790,examBonus:200,practicePoints:250},badges:[{id:'first_exam',name:'First assessment',description:'Complete your first assessment',target:1,progress:1,unlocked:true},{id:'exam_5',name:'Steady learner',description:'Complete five assessments',target:5,progress:2,unlocked:false}],leaderboard:[]};
function ward(id,name,average){return {id,student_id:id,name,grade:'SS2',reg_id:`ST-${id}`,admission_number:`ST-${id}`,school_name:'School record',average_score:average,attendance_pct:96,class_position:'3rd',total_class_students:28,completed_exams:2,total_exams:4,subjects_performance:names.map((subject_name,i)=>({subject_name,score:average-i*5,grade:'B'})),trend_data:[],attendance:{present_days:24,total_days:25},fees:{balance:12500},recent_activity:[{id:'1',title:'Mathematics result published',type:'result',date_label:'24 Oct',score:`${average}%`}],upcoming_events:[{id:1,title:'Chemistry assessment',subject_name:'Chemistry',month:'NOV',day:'03',time_str:'10:00 AM'}],reports:[]};}
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 console.log('Launching fixture browser');
 const browser=await puppeteer.launch({pipe:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu','--no-first-run']});
 console.log('Browser launched');
 const outcomes=[];
 try {
 for(const role of (process.argv.includes('--student-dashboard')?['student']:process.argv.includes('--guardian')?['guardian']:['student','guardian','operator','teacher'])) {
  console.log('Checking '+role);
  const page=await browser.newPage(); await page.evaluateOnNewDocument(() => { delete Object.getPrototypeOf(navigator).serviceWorker; }); await page.setBypassServiceWorker(true); await page.setRequestInterception(true);
  let empty=false, telemetryMissing=false, profileFailure=false, signedIn=true; let practiceSubmissions=0; const submittedAnswers=[]; const errors=[];
  page.on('pageerror',e=>{ errors.push(e.message); console.log(role+' runtime: '+e.stack); });
  page.on('request',async req=>{
    const url=new URL(req.url()); if(!url.pathname.startsWith('/api/'))return req.continue();
    let body=[];const p=url.pathname;
    if(p==='/api/auth/me'&&!signedIn)return req.respond({status:401,contentType:'application/json',body:'{}'});
    if(p==='/api/auth/me')body={user:{id:role==='student'?20:10,name:role==='guardian'?'Sara Yusuf':role==='student'?'Amina Yusuf':'School team',email:`${role}@test.invalid`,role,grade:'SS2',reg_id:'ST-20'}};
    else if(p==='/api/academic/active')body={activeSession:session,activeTerm:term};
    else if(p==='/api/academic/sessions')body={sessions:[session],terms:[term]};
    else if(p==='/api/config')body={school_name:'Acqad School',allow_student_registration:false};
    else if(p==='/api/grading/config')body={};
    else if(p==='/api/grading/subjects/1')body={id:1,name:'Mathematics',code:'MAT',class:'SS2'};
    else if(p==='/api/grading/policies/1')body=[{id:1,name:'Continuous assessment',max_marks:40,type:'manual',is_exam:0},{id:2,name:'Examination',max_marks:60,type:'manual',is_exam:1}];
    else if(p==='/api/grading/scores/1')body={students:[{id:20,name:'Amina Yusuf',reg_id:'ST-20'}],manualScores:[{student_id:20,grading_policy_id:1,score:35},{student_id:20,grading_policy_id:2,score:50}],cbtScores:{},rawCbtScores:{},termResults:[]};
    else if(p==='/api/practice/start')body={exam:{id:9001,subject:{id:4,name:'Mathematics practice',title:'Mathematics practice',code:'WAEC',duration:45,mode:'practice'},questions:[{id:1,question_text:'What is 2 + 2?',question_type:'objective',options_json:JSON.stringify(['4','3']),marks:1}]}};
    else if(p==='/api/practice/submit'){practiceSubmissions++;const sent=JSON.parse(req.postData()||'{}');submittedAnswers.push(sent.answers);body={score:1,total_score:1,total_questions:1,answered_questions:1,result_status:'released'};}
    else if(p==='/api/sync/content/manifest')body={packages:[{id:'fixture-math',subject:'MTH',exam_body:'WAEC',year:2025},{id:'fixture-eng',subject:'ENG',exam_body:'JAMB',year:2024}]};
    else if(p==='/api/subjects'||p==='/api/subjects/with-question-counts')body=empty?[]:subjects;
    else if(p==='/api/exams/results')body=empty?[]:results;
    else if(p==='/api/exams/active')body={server_time:new Date().toISOString(),exams:[]};
    else if(p==='/api/student/telemetry') {if(telemetryMissing)return req.respond({status:500,contentType:'application/json',body:JSON.stringify({error:'Unavailable'})});body=telemetry;}
    else if(p==='/api/guardian/profile') { if(profileFailure)return req.respond({status:500,contentType:'application/json',body:JSON.stringify({error:'Fixture unavailable'})}); body={id:10,name:'Sara Yusuf',email:'guardian@test.invalid',phone:'',address:'',relationship:'Parent',notify_attendance:true,notify_results:true,notify_fees:true,notify_messages:true}; }
    else if(p==='/api/guardian/wards')body={wards:empty?[]:[ward(20,'Amina Yusuf',82),ward(21,'Karim Yusuf',71)]};
    else if(p.endsWith('/notifications'))body={items:[],notifications:[],unreadCount:0,unread_count:0};
    else if(p==='/api/admin/session-snapshots')body={snapshots:[]};
    else if(p==='/api/users')body=[{id:20,name:'Amina Yusuf',role:'student'},{id:10,name:'School team',role:'teacher'}];
    else if(p.includes('/students'))body=[];
    else if(p.endsWith('/stream'))return req.respond({status:200,contentType:'text/event-stream',body:': fixture\n\n'});
    return req.respond({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  // Test-only middleware fixture; backend authentication is never contacted.
  await page.setCookie({name:`__exampool_session_${role}`,value:`fixture.${Buffer.from(JSON.stringify({role,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.fixture`,url:origin});
  const route=role==='operator'?'ADMIN':role;
  if(role==='guardian')await page.evaluateOnNewDocument(()=>{if(!localStorage.getItem('acad_guardian_theme'))localStorage.setItem('acad_guardian_theme','light');});
  await page.setViewport({width:1440,height:1100,deviceScaleFactor:1});
  await page.goto(`${origin}/${route}/dashboard/`,{waitUntil:'networkidle2',timeout:180000});
  const expected=role==='student'?'Learning insights':role==='guardian'?'A little closer':role==='operator'?'Institutional Overview':'Teaching Overview';
  await page.screenshot({path:path.join(output,`${role}-initial.png`),fullPage:true});
  console.log('Loaded '+page.url()+'; '+(await page.$eval('body',el=>el.innerText)).slice(0,150));
  await page.waitForFunction(text=>document.body?.innerText.includes(text),{timeout:30000},expected);
  await page.screenshot({path:path.join(output,`${role}-desktop.png`),fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${role} desktop overflow`);
  if(role==='teacher') {
    assert.equal(await page.$$eval('button[aria-label^="See more for"]',els=>els.length),4,'each subject has one See more menu');
    await page.focus('button[aria-label="See more for Mathematics"]');await page.keyboard.press('Enter');
    await page.waitForSelector('[role=menu]');
    assert.deepEqual(await page.$$eval('[role=menuitem]',els=>els.map(el=>el.textContent)),['Inspect questions','Gradebook','Results']);
    await page.screenshot({path:path.join(output,'teacher-subject-menu.png'),fullPage:true});
    await page.keyboard.press('Escape');await page.waitForSelector('[role=menu]',{hidden:true});
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'See more for Mathematics','menu restores focus');
    const published=await page.evaluate(()=>{const el=[...document.querySelectorAll('span')].find(el=>el.textContent==='Published');const s=getComputedStyle(el);return {bg:s.backgroundColor,border:s.borderWidth,radius:s.borderRadius};});
    assert.deepEqual(published,{bg:'rgba(0, 0, 0, 0)',border:'0px',radius:'0px'},'published is plain text');
  }
  if(role==='guardian') {
    await page.click('button[aria-label="Switch to dark mode"]');
    assert(await page.$eval('html',el=>el.dataset.theme==='dark'),'guardian dark mode');
    await page.screenshot({path:path.join(output,'guardian-dark.png'),fullPage:true});
    await page.click('button[aria-label="Switch to light mode"]');
    await page.click('button[aria-label="View Karim Yusuf"]');
    await page.waitForFunction(()=>document.querySelector('section[aria-label="Selected child"]')?.textContent.includes('Karim Yusuf'));
    await page.click('button[class*="switchButton"]');
    await page.waitForFunction(()=>location.pathname.includes('/guardian/select-child'));
    assert.equal(await page.$$eval('[role=dialog]',els=>els.length),0,'child selection is a page');
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Amina Yusuf')).click());
    await page.waitForFunction(()=>document.querySelector('section[aria-label="Selected child"]')?.textContent.includes('Amina Yusuf'));
  }
  if(role==='student') {
    const home=await page.$eval('body',el=>el.innerText);
    assert(!home.includes('Enrolled Subjects & Assessments'),'home must not show the old assessment grid');
    assert(!home.includes('Learning engagement analysis'),'home must not include a second detailed chart section');
  }
  for(const width of [390,320]){
    await page.setViewport({width,height:844,deviceScaleFactor:1});
    await new Promise(resolve=>setTimeout(resolve,350));
    await page.evaluate(()=>{ window.scrollTo(0,0); document.querySelectorAll("*").forEach(el=>{if(el.scrollTop)el.scrollTop=0;}); });
    await page.screenshot({path:path.join(output,`${role}-${width}.png`),fullPage:true});
    const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert(overflow.scroll<=overflow.width,`${role} ${width}px overflow: ${JSON.stringify(overflow)}`);
  }
  if(process.argv.includes('--student-dashboard')) {
    await page.setViewport({width:1440,height:1100});
    const lightSwitch=await page.$('button[aria-label="Switch to light theme"]');if(lightSwitch)await lightSwitch.click();
    await new Promise(resolve=>setTimeout(resolve,350));
    assert(await page.$('img[src="/gold-card-wave.svg"]'),'approved wave asset reused');
    const before=await page.$eval('[class*="xpHero"]',el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,text:el.textContent}));
    await page.screenshot({path:path.join(output,'student-wave-light.png'),fullPage:true});
    await page.click('button[aria-label="Switch to dark theme"]');await new Promise(resolve=>setTimeout(resolve,350));
    const after=await page.$eval('[class*="xpHero"]',el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,text:el.textContent}));
    assert.deepEqual(after,before,'theme change preserves XP content and dimensions');
    const surface=await page.$eval('#learning-overview [data-slot=card]',el=>getComputedStyle(el).backgroundColor);
    assert.notEqual(surface,'rgb(255, 255, 255)','dark cards use theme surface');
    await page.screenshot({path:path.join(output,'student-wave-dark.png'),fullPage:true});
    assert.deepEqual(errors,[],'student dashboard runtime');outcomes.push('Student wave, responsive layout, theme and XP stability passed');await page.close();continue;
  }
  if(['student','guardian'].includes(role)) {
    empty=true;telemetryMissing=true;
    await page.reload({waitUntil:'networkidle2',timeout:60000});
    await page.waitForFunction(text=>document.body?.innerText.includes(text),{timeout:30000},role==='student'?'Learning data unavailable':'Link a child');
    await page.screenshot({path:path.join(output,`${role}-empty.png`),fullPage:true});
  }
  if(role==='guardian') {
    await page.goto(`${origin}/guardian/settings/`,{waitUntil:'networkidle2'});
    await page.waitForFunction(()=>document.body?.innerText.includes('Settings & Profile'));
    assert(!(await page.$eval('body',el=>el.innerText)).includes('Adenike'),'no fabricated profile identity');
    profileFailure=true;
    await page.reload({waitUntil:'networkidle2'});
    await page.waitForSelector('[role=alert]');
    assert(await page.$eval('[role=alert]',el=>el.textContent.includes('profile could not be loaded')),'profile error state');
  }
  if(role==='student') {
    empty=false; telemetryMissing=false;
    await page.goto(origin+'/student/practice/',{waitUntil:'networkidle2'});
    await page.waitForSelector('select');
    assert.equal(await page.$$eval('button[aria-haspopup=dialog]',els=>els.length),0,'papers hidden before choosing a body');
    await page.select('select','WAEC');
    await page.click('button[aria-haspopup=dialog]');
    await page.waitForSelector('[role=dialog]');
    assert(!page.url().includes('/student/exam'),'selecting a paper must not start it');
    assert(await page.$eval('[role=dialog]',el=>el.textContent.includes('Start practice')),'explicit start action in preview');
    await new Promise(resolve=>setTimeout(resolve,250));
    await page.screenshot({path:path.join(output,'student-practice-modal.png'),fullPage:true});
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role=dialog]',{hidden:true});
    assert.equal(await page.$eval('select',el=>el.value),'WAEC','closing modal preserves body');
    await page.click('button[aria-haspopup=dialog]');
    await page.waitForSelector('[role=dialog]');
    await page.evaluate(()=>[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.includes('Start practice')).click());
    await page.waitForFunction(()=>location.pathname.includes('/student/exam')&&location.search.includes('practiceId=fixture-math'));
    await new Promise(resolve=>setTimeout(resolve,1200));
    console.log('Exam entry '+page.url()+' '+await page.evaluate(()=>document.body?.innerText));
    await page.screenshot({path:path.join(output,'student-exam-entry.png'),fullPage:true});
    await page.waitForFunction(()=>document.body?.innerText.includes('Begin Assessment'));
    assert(await page.$('svg[aria-label="Acqad Logo"]'),'exam preflight official logo');
    assert.equal(practiceSubmissions,0,'opening preflight must not submit an unstarted attempt');
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Begin Assessment')).click());
    await page.waitForFunction(()=>document.body?.innerText.includes('What is 2 + 2?'));
    await page.click('button[class*="optionButton"]');
    await page.screenshot({path:path.join(output,'student-exam-room.png'),fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'exam room phone overflow');
    await page.setViewport({width:1440,height:1000});
    await page.screenshot({path:path.join(output,'student-exam-desktop.png'),fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'exam room desktop overflow');
    await page.setViewport({width:320,height:844});
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Submit').click());
    await page.waitForFunction(()=>document.body?.innerText.includes('Final Attempt Summary'));
    await page.evaluate(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Confirm & Submit'));button.click();button.click();});
    await page.waitForFunction(()=>document.body?.innerText.includes('Outstanding Mastery'));
    assert.equal(practiceSubmissions,1,'repeated confirmation must not duplicate submission');
    assert.equal(submittedAnswers[0].length,1,'submission retains the selected answer');
    assert.equal(submittedAnswers[0][0].selected_option,0,'selected option zero is preserved');
    assert(await page.$('svg[aria-label="Acqad Logo"]'),'submission receipt official logo');
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Review Question Breakdown')).click());
    await page.waitForSelector('[role=dialog]');
    assert(await page.$eval('[role=dialog]',el=>el.textContent.includes('Assessment Evaluation Review')),'Material review dialog');
    await new Promise(resolve=>setTimeout(resolve,400));
    await page.screenshot({path:path.join(output,'student-review-minimal.png'),fullPage:true});
    await page.keyboard.press('Escape');await page.waitForSelector('[role=dialog]',{hidden:true});
    await page.goto(origin+'/student/examinations/',{waitUntil:'networkidle2'});
    await page.waitForSelector('select');
    await page.select('select','School assessments');
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Chemistry')).click());
    await page.waitForSelector('[role=dialog]');
    assert(await page.$eval('[role=dialog] button:disabled',el=>el.textContent.includes('Open exam hall')),'future assessment cannot start');
  }
  if(role==='guardian') {
    empty=false;profileFailure=false;
    await page.goto(origin+'/guardian/wards/profile/?id=20',{waitUntil:'networkidle2'});
    await page.waitForSelector('[role=tab]');
    await page.click('[role=tab]');await page.keyboard.press('End');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('[role=tabpanel]')?.textContent.includes('Blood Group'));
    assert(await page.$eval('[role=tabpanel]',el=>el.textContent.includes('Not provided')),'missing profile information is not invented');
    await page.goto(origin+'/guardian/wards/profile/?id=9999',{waitUntil:'networkidle2'});
    await page.waitForFunction(()=>document.body?.innerText.includes('Ward record not found'));
    for(const surface of ['wards','results','reports','performance','attendance','fees','messages','notifications','calendar','announcements','links','settings','examinations','more']) {
      await page.goto(`${origin}/guardian/${surface}/`,{waitUntil:'networkidle2'});
      assert(await page.$('#guardian-content'),'Guardian app shell on '+surface);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Guardian phone overflow on '+surface);
      const childPicker=await page.$('button[aria-label="Switch child, currently Amina Yusuf"]');
      assert(childPicker,'one labelled child selector in the shared header on '+surface);
      if(surface==='attendance') {
        assert(!(await page.$$eval('span',els=>els.some(el=>el.textContent==='4 Days'))),'no invented absent-day total');
        const currentMonth=new Date().toLocaleDateString('en',{month:'long',year:'numeric'});
        assert((await page.$eval('body',el=>el.textContent)).includes(currentMonth),'attendance calendar uses the selected month');
      }
      if(['wards','results','attendance'].includes(surface))await page.screenshot({path:path.join(output,'guardian-'+surface+'.png'),fullPage:true});
    }
  }
  if(role==='guardian') {
    await page.goto(origin+'/guardian/settings/?view=password',{waitUntil:'networkidle2'});
    await page.waitForSelector('[data-guardian-detail]');
    assert.equal(await page.$eval('[data-guardian-detail]',el=>getComputedStyle(el).position),'static','password is an inline page');
    await page.screenshot({path:path.join(output,'guardian-password-page.png'),fullPage:true});
    await page.goto(origin+'/guardian/more/',{waitUntil:'networkidle2'});
    assert.equal(await page.$$eval('.guardian-more-card',els=>els.length),7,'More page has school tools');
    await page.screenshot({path:path.join(output,'guardian-more-page.png'),fullPage:true});
  }
  if(role==='teacher') {
    await page.goto(origin+'/teacher/grading/details/?id=1',{waitUntil:'networkidle2'});
    await page.waitForFunction(()=>document.body?.innerText.includes('Draft mode'));
    assert(!(await page.$eval('body',el=>el.textContent)).includes('Continuous Assessment & Examination'),'no redundant gradebook eyebrow');
    const total=await page.evaluate(()=>{const el=[...document.querySelectorAll('span')].find(el=>el.textContent==='100 / 100');const s=getComputedStyle(el);return {bg:s.backgroundColor,border:s.borderWidth};});
    assert.deepEqual(total,{bg:'rgba(0, 0, 0, 0)',border:'0px'},'weight total is unboxed');
    await page.setViewport({width:1440,height:1000});
    await new Promise(resolve=>setTimeout(resolve,350));
    assert(await page.$eval('[class*="Gradebook_gradebook"]',el=>el.getBoundingClientRect().width>900),'gradebook fills desktop workspace');
    await page.screenshot({path:path.join(output,'teacher-gradebook.png'),fullPage:true});
    await page.evaluate(()=>[...document.querySelectorAll('[role=tab]')].find(el=>el.textContent.includes('Score Breakdown')).click());
    await page.waitForSelector('input[value="Continuous assessment"]');
    await page.screenshot({path:path.join(output,'teacher-gradebook-breakdown.png'),fullPage:true});
    await page.goto(origin+'/teacher/results/?subjectId=1',{waitUntil:'networkidle2'});
    await page.waitForSelector('select[aria-label="Subject"]');
    assert.equal(await page.$eval('select[aria-label="Subject"]',el=>el.value),'1','subject result link retains context');
    assert.equal(await page.$$eval('tbody tr',els=>els.length),1,'subject filter narrows results');
    await page.select('select[aria-label="Publication status"]','hidden');
    await page.waitForFunction(()=>document.body?.innerText.includes('No Examination Results Found'));
    await page.goto(origin+'/teacher/grading/',{waitUntil:'networkidle2'});
    await page.waitForFunction(()=>document.body?.innerText.includes('Subject Grading Center'));
  }
  if(role==='operator') {
    for(const surface of ['academic-sessions','users','messages','report-card','settings']) {
      await page.goto(`${origin}/ADMIN/${surface}/`,{waitUntil:'networkidle2'});
      if(surface==='settings')await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Network & Domain')).click());
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Admin '+surface+' mobile overflow');
      await page.screenshot({path:path.join(output,'admin-minimal-'+surface+'.png'),fullPage:true});
      if(surface==='report-card') {
        await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Open Report')).click());
        await page.waitForSelector('#report-empty-title');
        assert.equal(await page.$eval('button[disabled]',el=>el.textContent.trim()),'Print / Save PDF','empty reports cannot print');
        await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Change period').click());
        assert.equal(await page.evaluate(()=>document.activeElement.id),'report-session','empty-state action focuses period control');
        await page.screenshot({path:path.join(output,'report-workspace-phone.png'),fullPage:true});
        await page.setViewport({width:1440,height:1000});await new Promise(resolve=>setTimeout(resolve,350));
        await page.screenshot({path:path.join(output,'report-workspace-desktop.png'),fullPage:true});
        await page.setViewport({width:320,height:844});
        await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Cumulative report')).click());
        assert(await page.$eval('button[aria-pressed=true]',el=>el.textContent.includes('Cumulative')),'report mode selection');
        await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Return to roster').click());
        await page.waitForSelector('tbody');
      }
    }
    await page.goto(origin+'/ADMIN/annual-results/',{waitUntil:'networkidle2'});
    await page.waitForFunction(()=>document.body?.innerText.includes('Annual Results & Promotion'));
    assert(await page.$('dl'),'Admin results has a period summary');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Admin results phone overflow');
    await page.setViewport({width:1440,height:1000});
    await new Promise(resolve=>setTimeout(resolve,350));
    await page.screenshot({path:path.join(output,'admin-annual-results.png'),fullPage:true});
  }
  // The learning workspace scrolls independently of the static desktop rail.
  if(role==='student') {
    await page.goto(origin+'/student/results/',{waitUntil:'networkidle2'});
    await page.setViewport({width:1440,height:900});
    const scrollModel=await page.evaluate(()=>{const main=document.querySelector('main');const rail=document.querySelector('nav[aria-label="Student navigation"]');const before=rail.getBoundingClientRect().top;main.scrollTop=200;return {mainWidth:main.getBoundingClientRect().width,railMoved:Math.abs(rail.getBoundingClientRect().top-before),overflow:getComputedStyle(main).overflowY};});
    assert(scrollModel.mainWidth<=1200,'Student content maximum width');
    assert.equal(scrollModel.railMoved,0,'Student rail must stay fixed while main scrolls');
    assert.equal(scrollModel.overflow,'auto','Student main is the scroll surface');
  }
  signedIn=false;
  await page.setViewport({width:1440,height:900});
  await page.goto(origin+(role==='student'?'/':role==='operator'?'/ADMIN/':'/'+role+'/'),{waitUntil:'networkidle2'});
  await page.waitForSelector('form');
  assert(await page.$('svg[aria-label="Acqad Logo"]'),'same official login logo');
  const heavyLoginText=await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(el=>[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim())).filter(el=>Number(getComputedStyle(el).fontWeight)>500).map(el=>el.textContent.slice(0,35)));
  assert.deepEqual(heavyLoginText,[],'Login typography must use weight 500');
  assert.equal(await page.$eval('h1',el=>getComputedStyle(el).color),'rgb(255, 255, 255)','login story title contrast');
  console.log(role+' login font '+await page.$eval('main',el=>getComputedStyle(el).fontFamily));
  assert(await page.$eval('main > div',el=>Math.abs(el.getBoundingClientRect().width-innerWidth)<1),'login must span full viewport width');
  assert(await page.$eval('main > div',el=>el.getBoundingClientRect().height>=innerHeight),'login must fill viewport height');
  await page.screenshot({path:path.join(output,role+'-login.png'),fullPage:true});
  for(const width of [390,320]) {
    await page.setViewport({width,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),role+' login phone overflow');
    assert(await page.$eval('input',el=>parseFloat(getComputedStyle(el).fontSize)>=16),'login inputs avoid phone zoom');
    if(width===390)await page.screenshot({path:path.join(output,role+'-login-phone.png'),fullPage:true});
  }
  assert.deepEqual(errors,[],`${role} runtime errors`);
  if(['student','guardian'].includes(role)) {
    await page.goto(origin+(role==='student'?'/register/':'/guardian/register/'),{waitUntil:'networkidle2'});
    await page.waitForSelector('form');
    assert(await page.$('svg[aria-label="Acqad Logo"]'),'registration uses official logo');
    assert(!(await page.$eval('body',el=>el.textContent)).includes('ExamPool'),'registration has no old brand');
    await page.screenshot({path:path.join(output,role+'-register-phone.png'),fullPage:true});
  }
  outcomes.push(`${role}: desktop, 390px, 320px, runtime and controls passed`);
  await page.close();
 }
 fs.writeFileSync(path.join(output,'smoke-results.json'),JSON.stringify(outcomes,null,2)); console.log(outcomes.join('\n'));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

