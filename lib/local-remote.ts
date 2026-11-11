import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { syncUrl } from './local-config.mjs';
import { assertLocal } from './chat-auth.ts';
import { StudySyncError } from './study-sync.ts';
import { visitorFor, rememberVisitor } from './visitor-cookie.ts';

export const syncFile = () => path.join(process.cwd(), '.local', 'sync.json');
export async function deviceCredential(): Promise<{ token:string; deviceId:string }> {
  try {
    const data=JSON.parse(await readFile(syncFile(),'utf8'));
    if(/^[A-Za-z0-9_-]{43}$/.test(data.token)&&typeof data.deviceId==='string')return data;
  } catch {}
  throw new StudySyncError('사이트에서 연결 코드를 발급받아 이 기기를 연결해주세요.',401);
}
export async function deviceFetch(resource:string,init:RequestInit={}) {
  if(!/^(session|profile|devices|api-key|models|chat|summaries\/[0-9a-f-]{36}\/comments)(\?[^#]*)?$/.test(resource))throw new StudySyncError('지원하지 않는 요청입니다.',404);
  const {token}=await deviceCredential();
  return fetch(new URL(`/api/local/${resource}`,syncUrl),{
    ...init,headers:{'Authorization':`Bearer ${token}`,...(init.body?{'Content-Type':'application/json'}:{})},
    redirect:'error',cache:'no-store',signal:AbortSignal.timeout(resource==='chat'?120_000:20_000),
  });
}
export async function remoteJson(resource:string) {
  const response=await deviceFetch(resource);
  const data=await response.json();
  if(!response.ok)throw new StudySyncError(data?.error||'연결한 계정의 데이터를 불러오지 못했습니다.',response.status);
  return data;
}
const failure = (error:unknown) => NextResponse.json({error:error instanceof StudySyncError?error.message:'사이트에 연결하지 못했습니다.'},{status:error instanceof StudySyncError?error.status:503,headers:{'Cache-Control':'no-store'}});
export async function proxyPrivate(request:Request,resource:string) {
  try {assertLocal(request,request.method!=='GET');}catch{return NextResponse.json({error:'요청 출처를 확인해주세요.'},{status:403});}
  try {
    const raw=request.method==='GET'?undefined:await request.text();
    if(raw&&raw.length>5_000_000)return NextResponse.json({error:'요청이 너무 큽니다.'},{status:413});
    const response=await deviceFetch(resource+new URL(request.url).search,{method:request.method,body:raw});
    return new NextResponse(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  } catch(error){return failure(error);}
}
export async function publicJson(resource:string) {
  const response=await fetch(new URL(`/api/public/${resource}`,syncUrl),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20_000)});
  if(response.status===404)return null;
  if(!response.ok)throw new StudySyncError('공개 자료를 불러오지 못했습니다.',response.status);
  return response.json();
}
export async function proxyPublic(request:Request,parts:string[]=[]) {
  try {assertLocal(request,request.method!=='GET');}catch{return NextResponse.json({error:'요청 출처를 확인해주세요.'},{status:403});}
  try {
    const resource=parts.join('/');
    if(!/^(|visit|profiles(?:\/[a-zA-Z0-9_]{3,20})?|summaries\/[0-9a-f-]{36}(?:\/(?:view|reaction|comments))?)$/.test(resource))throw new StudySyncError('공개 자료를 찾을 수 없습니다.',404);
    if(request.method==='POST'&&/^summaries\/[0-9a-f-]{36}\/comments$/.test(resource))return proxyPrivate(request,resource);
    const visitor=visitorFor(request);
    const raw=request.method==='GET'?undefined:await request.text();
    if(raw&&raw.length>16000)return NextResponse.json({error:'요청이 너무 큽니다.'},{status:413});
    const response=await fetch(new URL(`/api/public${resource?`/${resource}`:''}${new URL(request.url).search}`,syncUrl),{
      method:request.method,body:raw,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20_000),
      headers:{Origin:new URL(syncUrl).origin,Cookie:`proving-visitor=${visitor}`,...(raw?{'Content-Type':'application/json'}:{})},
    });
    return rememberVisitor(new NextResponse(await response.text(),{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}),visitor);
  }catch(error){return failure(error);}
}
