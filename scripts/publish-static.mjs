import {cp,mkdir,readdir,stat,rm,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'frontend','dist');
const target=path.join(root,'dist');
for(const dir of [source,target]) {
  if(!dir.startsWith(root+path.sep))throw new Error('Static publication must stay within the project');
}
await stat(path.join(source,'index.html'));
await stat(path.join(source,'student','dashboard','index.html'));
await mkdir(target,{recursive:true});
const entries=await readdir(source,{withFileTypes:true});
// Publish content-addressed assets first. Keep old assets for already-open clients.
// School uploads belong to the running server, not to this build.
entries.sort((a,b)=>a.name==='_next'?-1:b.name==='_next'?1:0);
for(const entry of entries) {
  if(entry.name==='uploads')continue;
  if(entry.isSymbolicLink())throw new Error('Unexpected symlink in static export');
  await cp(path.join(source,entry.name),path.join(target,entry.name),{recursive:true,force:true,dereference:false});
}
// Retired student route: teacher preparation notes are staff-only documents.
const retired=path.resolve(target,'student','lesson-notes');
if(!retired.startsWith(path.resolve(target)+path.sep))throw new Error('Retired route escaped the static export');
try {
  if((await lstat(retired)).isSymbolicLink())throw new Error('Unexpected symlink in retired static route');
  await rm(retired,{recursive:true,force:true});
} catch(error) {if(error.code!=='ENOENT')throw error;}
console.log('Published frontend/dist to dist; school uploads and older assets preserved.');
