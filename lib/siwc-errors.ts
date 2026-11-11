export type Recovery = 'reauth' | 'permission' | 'usage' | 'retry';
// 다시 시도해도 풀리지 않는 사용량·크레딧 소진 코드. 사용량 관리 안내로 보낸다.
const creditCodes=new Set(['credit_balance_exhausted','insufficient_quota']);
export const isUsageCode=(code?:string)=>code==='subscription_sharing_usage_limit_exceeded'||Boolean(code&&creditCodes.has(code));
export function recoveryFor(status:number,code?:string):Recovery {
  if(code==='invalid_grant'||code==='invalid_token'||code==='direct_scope_missing'||status===401)return 'reauth';
  if(status===429||isUsageCode(code))return 'usage';
  if(status===403)return 'permission';
  return 'retry';
}
export class SiwcError extends Error {
  status:number; code?:string; requestId?:string; param?:string;
  constructor(status:number,code?:string,requestId?:string,param?:string){
    super(code&&creditCodes.has(code)?'사용 가능한 크레딧을 모두 사용했습니다. 사용량과 결제 설정을 확인해주세요.':code==='json_instruction_missing'?'AI 응답 형식 설정에 문제가 있습니다. 운영자에게 문의해주세요.':code==='context_length_exceeded'?'대화가 모델의 입력 한도를 초과했습니다. 새 노트에서 질문 범위를 줄여주세요.':status===400&&param?.startsWith('input')?'모델이 대화 입력을 받아들이지 못했습니다. 질문 길이와 선택한 모델을 확인해주세요.':code==='api_key_unreadable'?'저장된 OpenAI API 키를 읽을 수 없습니다. 설정에서 API 키를 다시 저장해주세요.':code==='api_key_encryption_not_configured'?'서버의 API 키 보호 설정이 누락되었습니다. 운영자에게 문의해주세요.':code==='api_key_missing'?'설정에서 OpenAI API 키를 먼저 연결해주세요.':code==='api_key_invalid'?'OpenAI API 키가 유효하지 않습니다. 설정에서 키를 교체해주세요.':status===401?'로그인 권한이 만료되었거나 철회되었습니다. 다시 인증해주세요.':status===403?'계정 또는 워크스페이스 정책으로 요청이 허용되지 않습니다.':status===429?'사용량 제한에 도달했습니다. 사용량 설정을 확인해주세요.':'일시적으로 응답을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.');
    this.status=status;this.code=code;this.requestId=requestId;this.param=param;
  }
}
// 원문 오류 메시지에는 사용자 입력이나 인증 정보가 포함될 수 있어 전달하지 않는다.
export async function upstreamError(response:Response):Promise<SiwcError>{
  const body=await response.json().catch(()=>null);
  const raw=typeof body?.error==='string'?body.error:body?.error?.code;
  let code=typeof raw==='string'&&/^[a-zA-Z0-9_.-]{1,160}$/.test(raw)?raw:undefined;
  const message = body?.error?.message;
  // Classify known validation failures without returning the upstream message,
  // which can contain user input or credentials.
  if (response.status === 400 && typeof message === 'string' && /json/i.test(message) && /must contain|must include|contain the word/i.test(message)) code = 'json_instruction_missing';
  const rawParam=body?.error?.param;
  const param=typeof rawParam==='string'&&/^[a-zA-Z0-9_.\[\]-]{1,100}$/.test(rawParam)?rawParam:undefined;
  return new SiwcError(response.status,code,response.headers.get('x-request-id')??undefined,param);
}
export function errorResponse(error:unknown){
  const e=error instanceof SiwcError?error:new SiwcError(503);
  // 일반 503은 원인을 화면에 알리지 않으므로 서버 로그에 남긴다. 사용자 입력·토큰은 포함하지 않는다.
  if(!(error instanceof SiwcError)){
    const failure=error as {name?:string;message?:string;cause?:{code?:string}};
    console.error('request failed',{name:failure?.name,message:failure?.message?.slice(0,200),cause:failure?.cause?.code});
  }else if(e.status>=500)console.error('upstream failed',{status:e.status,code:e.code,requestId:e.requestId});
  return Response.json({error:e.message,code:e.code,param:e.param,requestId:e.requestId,recovery:recoveryFor(e.status,e.code)},{status:e.status,headers:{'Cache-Control':'no-store'}});
}
