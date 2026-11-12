import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'ecard-workflow-'));
const port=String(18000+Math.floor(Math.random()*10000));
const env={...process.env,EXAMPOOL_DB:path.join(dir,'qa.db'),PORT:port,TEST_BASE_URL:`http://127.0.0.1:${port}`,RENDER:'1',JWT_SECRET:'isolated-workflow-verification-only',NODE_ENV:'test'};
const server=Bun.spawn(['bun','server.ts'],{env,stdout:Bun.file(path.join(dir,'server.log')),stderr:Bun.file(path.join(dir,'server.err.log'))});
try{
 let ready=false;
 for(let i=0;i<100;i++){try{const r=await fetch(env.TEST_BASE_URL+'/api/health');if(r.ok){ready=true;break;}}catch{}await Bun.sleep(150);}
 if(!ready){console.log(await Bun.file(path.join(dir,'server.err.log')).text());throw new Error('Isolated QA server did not start');}
 const setupState=await (await fetch(env.TEST_BASE_URL+'/api/setup/status')).json() as any;
 if(setupState.data?.setupRequired){
   const setup=(suffix:string)=>fetch(env.TEST_BASE_URL+'/api/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'QA Administrator',email:`setup-${suffix}@workflow.test`,password:'Local-QA-only-123!',schoolName:'Workflow QA School'})});
   const responses=await Promise.all([setup('one'),setup('two')]);
   const statuses=responses.map(r=>r.status).sort();
   if(JSON.stringify(statuses)!=='[201,403]')throw new Error(`Concurrent setup was not isolated: ${statuses}`);
   const settings=await (await fetch(env.TEST_BASE_URL+'/api/settings/public')).json() as any;
   if(settings.data?.school_name!=='Workflow QA School')throw new Error('Setup school identity was not preserved');
   console.log('PASS: concurrent initial setup creates one admin and preserves the school name.');
 }
 const tests=Bun.spawn(['bun','test','tests/workflow_readiness.test.ts','tests/session_isolation_and_concurrency.test.ts','tests/admin_guardian_link_and_messaging.test.ts','tests/guardian_teacher_workflow.test.ts','tests/manual_grading_subject_workflow.test.ts'],{env,stdout:'inherit',stderr:'inherit'});
 process.exitCode=await tests.exited;
 if(process.exitCode)console.log(await Bun.file(path.join(dir,'server.err.log')).text());
}finally{server.kill();await server.exited;console.log('Temporary verification data:',dir);}
