const assert=require('node:assert/strict');
const path=require('node:path');
module.exports=async function checkStudentRefinement(page,output){
 const group='[aria-label="XP illustration"]';
 const shot=async name=>{await new Promise(r=>setTimeout(r,700));await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});};
 const hero=()=>page.$eval('[class*="xpHero"]',el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,text:el.textContent}));
 const original=await hero();
 assert.equal(await page.$$eval('nav[aria-label="Student navigation"] svg[data-icon-source="lucide"]',els=>els.length),0,'navigation has no outline Lucide icons');
 const colors=await page.$$eval('nav[aria-label="Student navigation"] svg',els=>els.map(el=>getComputedStyle(el).color));
 assert(new Set(colors).size>=5,'navigation uses semantic icon colors');
 assert(await page.$('header svg[data-icon-source="phosphor"]'),'header uses official filled icons');
 assert.equal(await page.$$eval('[class*="achievementMark"]',els=>els.filter(el=>getComputedStyle(el).backgroundColor!=='rgba(0, 0, 0, 0)').length),0,'achievement artwork has no decorative backgrounds');
 await page.click('button[aria-label="Pause illustration slideshow"]');
 await page.click('button[aria-label="Show golden wave"]');await shot('student-filled-wave-dark');
 await page.click('button[aria-label="Show golden trophy"]');await shot('student-filled-trophy-dark');
 assert.deepEqual(await hero(),original,'only the illustration changes, not XP text or geometry');
 await page.click('button[aria-label="Switch to light theme"]');await shot('student-filled-trophy-light');
 await page.click('button[aria-label="Show golden wave"]');await shot('student-filled-wave-light');
 const start=Date.now();await page.click('button[aria-label="Play illustration slideshow"]');
 await page.waitForFunction(()=>document.querySelector('[aria-label="XP illustration"]').dataset.slide==='trophy',{polling:100,timeout:8500});
 assert(Date.now()-start>=4500,'automatic change waits five seconds');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>document.querySelector('[aria-label="XP illustration"]').dataset.autoplay==='false',{polling:100});
 const hiddenSlide=await page.$eval(group,el=>el.dataset.slide);await new Promise(r=>setTimeout(r,5300));
 assert.equal(await page.$eval(group,el=>el.dataset.slide),hiddenSlide,'hidden tab does not rotate');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await page.waitForFunction(()=>document.querySelector('[aria-label="XP illustration"]').dataset.autoplay==='false',{polling:100});
 await page.click('button[aria-label="Show golden wave"]');await new Promise(r=>setTimeout(r,5300));
 assert.equal(await page.$eval(group,el=>el.dataset.slide),'wave','reduced motion disables automatic rotation');
 await page.click('button[aria-label="Show golden trophy"]');
 assert.equal(await page.$eval('[class*="trophyFrame"]',el=>getComputedStyle(el).transitionDuration),'0s','reduced motion disables transitions');
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
 await page.click('button[aria-label="Switch to dark theme"]');
 await page.reload({waitUntil:'networkidle2'});
 assert.equal(await page.$eval('html',el=>el.dataset.theme),'dark','dark theme survives reload');
 assert.equal(await page.$eval('html',el=>getComputedStyle(el).colorScheme),'dark','native controls use dark color scheme');
 const origin=new URL(page.url()).origin;
 for(const route of ['examinations','practice','results','settings','notifications','library','community','report-card']){
  await page.goto(`${origin}/student/${route}/`,{waitUntil:'networkidle2'});
  assert.equal(await page.$eval('html',el=>el.dataset.theme),'dark',route+' keeps dark mode');
  const bad=await page.$$eval('main input,main select,main textarea,main [data-slot="card"]',els=>els.filter(el=>getComputedStyle(el).backgroundColor==='rgb(255, 255, 255)').map(el=>el.tagName));
  assert.deepEqual(bad,[],route+' has no fixed white controls/cards');
  if(route==='practice'){
   const selects=await page.$$('select');await selects[selects.length-1].select('WAEC');
   await page.click('button[aria-haspopup="dialog"]');await page.waitForSelector('[role="dialog"]');
   assert.notEqual(await page.$eval('[role="dialog"]',el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','practice preview follows dark theme');await shot('student-filled-practice-dark');await page.keyboard.press('Escape');
  }
  if(route==='results'){
   await page.evaluate(()=>[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Review').click());
   await page.waitForSelector('[role="dialog"]');
   assert.notEqual(await page.$eval('[role="dialog"]',el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','review MUI portal follows dark theme');await shot('student-filled-review-dark');await page.keyboard.press('Escape');
  }
 }
 await page.goto(`${origin}/student/exam/?practiceId=fixture-math`,{waitUntil:'networkidle2'});
 await page.waitForFunction(()=>document.body.innerText.includes('Begin Assessment'),{polling:100});
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(el=>el.textContent.includes('Begin Assessment')).click());
 await page.waitForFunction(()=>document.body.innerText.includes('What is 2 + 2?'),{polling:100});
 await page.click('button[title="Open Calculator"]');
 assert.notEqual(await page.$eval('button[aria-label="Close calculator"]',el=>getComputedStyle(el.parentElement.parentElement).backgroundColor),'rgb(255, 255, 255)','calculator follows dark theme');
 await shot('student-filled-exam-calculator-dark');await page.click('button[aria-label="Close calculator"]');
 await page.click('button[title="Open Scratchpad"]');
 const pen=await page.$eval('input[type="color"]',el=>el.value);
 assert.match(pen,/^#[a-fA-F0-9]{6}$/,'scratchpad uses a real pen color, not an unresolved CSS variable');
 await shot('student-filled-exam-scratchpad-dark');await page.click('button[title="Open Scratchpad"]');
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Submit').click());
 await page.waitForFunction(()=>document.body.innerText.includes('Confirm & Submit'),{polling:100});await shot('student-filled-attempt-summary-dark');
 await page.setViewport({width:320,height:844});await page.goto(`${origin}/student/dashboard/`,{waitUntil:'networkidle2'});
 await page.click('button[aria-label="Pause illustration slideshow"]');await page.click('button[aria-label="Show golden trophy"]');await shot('student-filled-trophy-dark-320');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'filled dashboard has no mobile overflow');
 console.log('Filled icons, both slideshow states, five-second timer, pause/visibility/reduced motion, persistent dark theme, and student pages passed');
};
