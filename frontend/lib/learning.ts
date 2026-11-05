import { API_BASE, buildAuthHeaders, fetchWithAuth } from './api';
export type LearningPost={id:number;author_id:number;author_name:string;author_role:string;title:string;body:string;kind:string;challenge_code:string|null;resolved:number;created_at:number;reply_count:number};
export type LearningReply={id:number;author_id:number;author_name:string;author_role:string;body:string;created_at:number};
export type LessonFile={id:number;filename:string;mime:string;bytes:number};
export type LessonNote={id:number;teacher_id:number;teacher_name:string;subject_id:number;subject_name:string;class:string;term:string;session:string;title:string;body:string;state:string;feedback:string;files:LessonFile[];updated_at:number};
export async function learningRequest<T>(path:string,body?:unknown):Promise<T> {
  const result=await fetchWithAuth<T>(`/api/learning${path}`,body===undefined?{}:{method:'POST',body:JSON.stringify(body)},{redirectOn503:false});
  if(!result) throw new Error('The learning service is unavailable. Please retry.');
  return result;
}
export async function uploadLessonFile(file:File,library=false):Promise<LessonFile> {
  const form=new FormData();form.append('file',file);
  const response=await fetch(API_BASE+`/api/learning/${library?'library/':''}files`,{method:'POST',body:form,credentials:'include',headers:buildAuthHeaders(undefined,undefined,false)});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'The file could not be uploaded. Try again.');
  return result.data??result;
}
export async function downloadLessonFile(file:LessonFile,library=false) {
  const response=await fetch(API_BASE+`/api/learning/${library?'library/':''}files/${file.id}`,{credentials:'include',headers:buildAuthHeaders()});
  if(!response.ok)throw new Error('This attachment could not be downloaded. Refresh and try again.');
  const url=URL.createObjectURL(await response.blob());
  const link=document.createElement('a');link.href=url;link.download=file.filename;link.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),10000);
}
export type LearningResource={id:number;teacher_id:number;subject_id:number;title:string;body:string;kind:string;external_url:string;state:string;subject_name:string;teacher_name:string;class:string;term:string;files:LessonFile[];opened_at:number|null;completed_at:number|null};
