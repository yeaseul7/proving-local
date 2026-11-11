import { syncUrl } from '@/lib/local-config.mjs';
import { remoteJson } from '@/lib/local-remote';
import { getAuth } from '@/lib/auth';
import { chatgptPlanAi } from '@/lib/ai/chatgpt-plan';
import { StudySyncError } from '@/lib/study-sync';
export async function GET(request:Request){
  try{
    getAuth().checkRequest(request);
    const session=await remoteJson('session');
    return Response.json({...session,local:true,publicBaseUrl:syncUrl,chatgptPlan:{connected:(await chatgptPlanAi.status()).canChat}},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    if(error instanceof StudySyncError&&error.status===401)return Response.json({account:null,provider:'supabase',local:true,canChat:false,chatgptPlan:{connected:false}},{headers:{'Cache-Control':'no-store'}});
    return Response.json({error:'사이트 계정에 연결하지 못했습니다.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
