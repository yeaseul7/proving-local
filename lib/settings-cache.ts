import {createRequestCache} from './request-cache.ts';
export const settingsCache=createRequestCache(60_000);
export const settingsKey=(account:string,resource:'api-key'|'devices')=>JSON.stringify([account,resource]);
export async function readSetting<T>(account:string,resource:'api-key'|'devices',force=false):Promise<T>{
 const key=settingsKey(account,resource);
 return settingsCache.load(key,async()=>{
  const response=await fetch(`/api/${resource}`,{cache:'no-store',signal:AbortSignal.timeout(15_000)}),data=await response.json();
  if(!response.ok){if([401,403,409].includes(response.status))settingsCache.clear();throw new Error(data.error||'설정을 불러오지 못했습니다.');}
  if(resource==='devices'?!Array.isArray(data.devices):typeof data.connected!=='boolean')throw new Error('설정 응답을 확인하지 못했습니다.');
  return (resource==='devices'?{devices:data.devices}:{connected:data.connected,lastFour:data.lastFour??null}) as T;
 },force);
}
