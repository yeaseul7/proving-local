import type {ExamAttempt,ExamListItem} from './study-exam.ts';
import {examScore,validExam,validExamProgress} from './study-exam.ts';
export type ExamPage={exams:ExamListItem[];hasMore:boolean;total?:number};
type Entry={value:unknown;expires:number};
type Bucket={generation:number;entries:Map<string,Entry>;pending:Map<string,Promise<unknown>>};
const accounts=new Map<string,Bucket>();
const TTL=5*60*1000,MAX_ENTRIES=40;
function bucket(account:string){let b=accounts.get(account);if(!b){b={generation:0,entries:new Map(),pending:new Map()};accounts.set(account,b);}return b;}
export function clearExamCache(){accounts.clear();}
export function invalidateExamCache(account:string,id?:string){
 const b=bucket(account);b.generation++;b.pending.clear();
 for(const key of b.entries.keys())if(key.startsWith('page:')||!id||key===`exam:${id}`)b.entries.delete(key);
}
function put(b:Bucket,key:string,value:unknown){
 b.entries.delete(key);b.entries.set(key,{value:structuredClone(value),expires:Date.now()+TTL});
 while(b.entries.size>MAX_ENTRIES)b.entries.delete(b.entries.keys().next().value!);
}
async function load<T>(account:string,key:string,fetcher:()=>Promise<T>,force:boolean):Promise<T>{
 const b=bucket(account);
 if(force){b.generation++;b.entries.delete(key);b.pending.delete(key);}
 const entry=b.entries.get(key);
 if(entry&&entry.expires>Date.now()){b.entries.delete(key);b.entries.set(key,entry);return structuredClone(entry.value) as T;}
 if(b.pending.has(key))return structuredClone(await b.pending.get(key)) as T;
 const generation=b.generation;
 const promise=fetcher().then(value=>{if(accounts.get(account)===b&&generation===b.generation)put(b,key,value);return value;});
 b.pending.set(key,promise);
 try{return structuredClone(await promise);}finally{if(b.pending.get(key)===promise)b.pending.delete(key);}
}
export const cachedExamPage=(account:string,offset:number,fetcher:()=>Promise<ExamPage>,force=false)=>load(account,`page:${offset}`,fetcher,force);
export const cachedExam=(account:string,id:string,fetcher:()=>Promise<ExamAttempt>,force=false)=>load(account,`exam:${id}`,async()=>{
 const attempt=await fetcher();if(attempt.id!==id||!validExam(attempt.exam)||!validExamProgress(attempt.answers,attempt.memos,attempt.submitted))throw new Error('시험지 형식을 확인하지 못했습니다.');return attempt;
},force);
// 서버가 저장 완료를 확인한 값만 캐싱한다. 입력 중인 초안은 캐시에 넣지 않는다.
export function cacheSavedExam(account:string,attempt:ExamAttempt,created=false){
 if(!created&&!accounts.has(account))return;
 const b=bucket(account),previous=b.entries.get(`exam:${attempt.id}`)?.value as ExamAttempt|undefined;
 const changedOrder=created||!!previous&&previous.submitted!==attempt.submitted||[...b.entries].some(([key,entry])=>key.startsWith('page:')&&(entry.value as ExamPage).exams.some(e=>e.id===attempt.id&&e.submitted!==attempt.submitted));
 b.generation++;b.pending.clear();
 for(const [key,entry] of b.entries){
  if(!key.startsWith('page:'))continue;
  if(changedOrder){b.entries.delete(key);continue;}
  const page=entry.value as ExamPage;
  entry.value={...page,exams:page.exams.map(item=>item.id===attempt.id?{...item,isPublic:attempt.isPublic,submitted:attempt.submitted,updatedAt:attempt.updatedAt,score:attempt.submitted?examScore(attempt.exam,attempt.answers):0}:item)};
 }
 put(b,`exam:${attempt.id}`,attempt);
}
