import {createRequestCache} from './request-cache.ts';
import type {RecordComment} from './workspace-types.ts';
export const commentsCache=createRequestCache(60_000);
export const commentsKey=(id:string)=>id.toLowerCase();
export function readComments(id:string,force=false){
 return commentsCache.load<RecordComment[]>(commentsKey(id),async()=>{
  const response=await fetch(`/api/public/summaries/${id}/comments`,{cache:'no-store',signal:AbortSignal.timeout(15_000)}),data=await response.json();
  if(!response.ok||!Array.isArray(data.comments))throw new Error('댓글을 불러오지 못했어요.');
  return data.comments;
 },force);
}
