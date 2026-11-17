// 브라우저 메모리 전용. 진행 중 요청을 공유하고, 저장·무효화 이전의 늦은 응답은 버린다.
export function createRequestCache(ttl:number,maxEntries=100){
 type Entry={value?:unknown;expires:number;pending?:Promise<unknown>};
 const entries=new Map<string,Entry>();
 function put<T>(key:string,value:T){
  entries.delete(key);entries.set(key,{value:structuredClone(value),expires:Date.now()+ttl});
  while(entries.size>maxEntries)entries.delete(entries.keys().next().value!);
 }
 function peek<T>(key:string):T|undefined{
  const entry=entries.get(key);return entry&&entry.expires>Date.now()&&'value' in entry?structuredClone(entry.value) as T:undefined;
 }
 async function load<T>(key:string,fetcher:()=>Promise<T>,force=false):Promise<T>{
  if(force)entries.delete(key);
  const value=peek<T>(key);if(value!==undefined)return value;
  const existing=entries.get(key);if(existing?.pending)return structuredClone(await existing.pending) as T;
  const entry:Entry={expires:0};entries.delete(key);entries.set(key,entry);
  while(entries.size>maxEntries)entries.delete(entries.keys().next().value!);
  const task=Promise.resolve().then(fetcher).then(result=>{if(entries.get(key)===entry)put(key,result);return result;});entry.pending=task;
  try{return structuredClone(await task);}catch(error){if(entries.get(key)===entry)entries.delete(key);throw error;}
 }
 return {load,peek,put,invalidate:(key:string)=>entries.delete(key),clear:()=>entries.clear()};
}
