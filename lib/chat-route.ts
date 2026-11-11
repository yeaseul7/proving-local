import { parseStudyFlow } from '@/lib/study-flow';
import { errorResponse } from '@/lib/siwc-errors';
import { getAuth, requireIdentity } from '@/lib/auth';
import { getAi } from '@/lib/ai';
import { apiMessages, validStoredMessages } from '@/lib/chat';
import { conversationInstructions, studyInstructions } from '@/lib/prompts';
import { prepareConversation } from '@/lib/study-request';
import { boundedMemory } from '@/lib/chat-budget';
import { parseStudyReply } from '@/lib/chat-memory';
import { summarizeTranscript } from '@/lib/study-summary';
import { chatgptPlanAvailable, runtimeMode } from '@/lib/runtime-mode';
import { chatgptPlanAi } from '@/lib/ai/chatgpt-plan';
const busy=new Set<string>();
export async function POST(request:Request){
  let lock:string|undefined;
  let requestedModel:string|undefined;
  try{
    // 공급자가 비활성화된 사이트에서는 AI 호출을 만들지 않는다.
    if(runtimeMode().ai==='none')return Response.json({error:'이 사이트에서는 공부 대화를 제공하지 않습니다.'},{status:404,headers:{'Cache-Control':'no-store'}});
    getAuth().checkRequest(request,true);
    const identity=await requireIdentity();
    if(busy.has(identity.accountKey))return Response.json({error:'앞선 응답이 완료된 뒤 다시 보내주세요.'},{status:429});
    const raw=await request.text();if(raw.length>2000000)return Response.json({error:'대화가 너무 깁니다. 새 공부를 시작해주세요.'},{status:413});
    let body;
    try { body=JSON.parse(raw); } catch { return Response.json({error:'요청 형식을 확인해주세요.'},{status:400}); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({error:'요청 형식을 확인해주세요.'},{status:400});
    if(body.account!==identity.accountKey)return Response.json({error:'로그인 계정이 변경되었습니다. 새로고침해주세요.'},{status:409});
    if(body.summarize!==true&&body.continuation===undefined&&raw.length>150000)return Response.json({error:'대화가 너무 깁니다. 새 공부를 시작해주세요.'},{status:413});
    const summarizing = body.summarize === true;
    if(typeof body.model!=='string'||body.model.length>120)return Response.json({error:'모델을 확인해주세요.'},{status:400});
    let messages;
    let studyFlow;
    if (summarizing) {
      if (!validStoredMessages(body.messages) || !body.messages.length) return Response.json({error:'기록할 대화를 확인해주세요.'},{status:400});
      messages = apiMessages(body.messages);
    } else {
      try { studyFlow = parseStudyFlow(body.studyFlow); messages = prepareConversation(body); }
      catch (error) { return Response.json({ error: (error as Error).message, code: 'invalid_question' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }
    }
    let respond;
    let model=body.model;
    requestedModel=body.model;
    if (body.model.startsWith('plan:')) {
      // 로컬에서 연결한 ChatGPT 플랜. 배포 주소에서는 받지 않는다.
      if (!chatgptPlanAvailable()) return Response.json({error:'ChatGPT 플랜은 로컬 실행에서만 사용할 수 있습니다.'},{status:400,headers:{'Cache-Control':'no-store'}});
      model=body.model.slice(5);
      await chatgptPlanAi.prepare();
      respond = chatgptPlanAi.respond.bind(chatgptPlanAi);
    } else {
      const ai = getAi();
      await ai.prepare();
      respond = ai.respond.bind(ai);
    }
    if(busy.has(identity.accountKey))return Response.json({error:'앞선 응답이 완료된 뒤 다시 보내주세요.'},{status:429});
    lock=identity.accountKey;busy.add(identity.accountKey);
    const language = body.language === 'en' ? 'en' : 'ko';
    if (summarizing) {
      const text = await summarizeTranscript(messages, studyInstructions(language, true), options => respond({ ...options, model, timeoutMs: 120_000 }));
      return Response.json({ text, account: identity.accountKey }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const rawReply = await respond({ model, messages, timeoutMs:120_000,
      instructions:conversationInstructions(language, body.generateTitle===true, studyFlow), json:true, maxOutputTokens:4096 });
    const reply = parseStudyReply(rawReply, body.generateTitle===true);
    return Response.json({ ...reply, memory: boundedMemory(reply.memory), account: identity.accountKey }, { headers: { 'Cache-Control': 'no-store' } });
  }catch(error){
    if(requestedModel)console.error('chat failed',{model:requestedModel});
    return errorResponse(error);
  }
  finally{if(lock)busy.delete(lock);}
}
