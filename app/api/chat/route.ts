import { POST as localChat } from '@/lib/chat-route';
import { proxyPrivate } from '@/lib/local-remote';
import { assertLocal } from '@/lib/chat-auth';
export async function POST(request:Request){
  try{assertLocal(request,true);}catch{return Response.json({error:'요청 출처를 확인해주세요.'},{status:403});}
  const raw=await request.clone().text();
  if(raw.length>2_000_000)return Response.json({error:'대화가 너무 깁니다.'},{status:413});
  let body;try{body=JSON.parse(raw);}catch{return Response.json({error:'요청 형식을 확인해주세요.'},{status:400});}
  return typeof body?.model==='string'&&body.model.startsWith('plan:')?localChat(request):proxyPrivate(request,'chat');
}
