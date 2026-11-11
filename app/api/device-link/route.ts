import { mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertLocal } from '@/lib/chat-auth';
import { syncUrl } from '@/lib/local-config.mjs';
import { syncFile } from '@/lib/local-remote';
export async function POST(request:Request){
  try{assertLocal(request,true);}catch{return Response.json({error:'요청 출처를 확인해주세요.'},{status:403});}
  try{
    const raw=await request.text();if(raw.length>1024)return Response.json({error:'연결 코드를 확인해주세요.'},{status:400});
    const body=JSON.parse(raw);
    const code=typeof body?.code==='string'?body.code.replace(/[\s-]/g,'').toUpperCase():'';
    if(!/^[A-HJKMNP-Z2-9]{12}$/.test(code))return Response.json({error:'12자리 연결 코드를 입력해주세요.'},{status:400});
    const response=await fetch(new URL('/api/devices/link',syncUrl),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,name:'내 PC'}),redirect:'error',signal:AbortSignal.timeout(15_000)});
    const data=await response.json();
    if(!response.ok)return Response.json({error:data.error||'연결하지 못했습니다.'},{status:response.status});
    if(!/^[A-Za-z0-9_-]{43}$/.test(data.token)||!/^[0-9a-f-]{36}$/i.test(data.deviceId))throw new Error('Invalid device credential');
    const file=syncFile();await mkdir(path.dirname(file),{recursive:true,mode:0o700});
    const temporary=`${file}.${randomUUID()}.tmp`;
    await writeFile(temporary,JSON.stringify({url:syncUrl,token:data.token,deviceId:data.deviceId,name:'내 PC'}),{mode:0o600,flag:'wx'});
    await rename(temporary,file);
    return Response.json({linked:true},{headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({error:'사이트에 연결하지 못했습니다. 새 코드를 받아 다시 시도해주세요.'},{status:503});}
}
