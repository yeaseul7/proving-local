import { errorResponse } from '@/lib/siwc-errors';
import { getAuth, requireIdentity } from '@/lib/auth';
import { getAi } from '@/lib/ai';
import { chatgptPlanAi } from '@/lib/ai/chatgpt-plan';
import { chatgptPlanAvailable } from '@/lib/runtime-mode';
export async function GET(request:Request){
  try{
    getAuth().checkRequest(request);
    // 로컬에서 연결한 ChatGPT 플랜 모델은 API 키 모델과 구분되게 plan: 접두사를 붙인다.
    if(new URL(request.url).searchParams.get('provider')==='chatgpt'){
      if(!chatgptPlanAvailable())return Response.json({error:'ChatGPT 플랜은 로컬 실행에서만 연결할 수 있습니다.'},{status:404,headers:{'Cache-Control':'no-store'}});
      await requireIdentity();
      const models=(await chatgptPlanAi.listModels()).map(model=>({...model,id:`plan:${model.id}`}));
      return Response.json({models},{headers:{'Cache-Control':'no-store'}});
    }
    return Response.json({models:await getAi().listModels()},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return errorResponse(error);}
}
