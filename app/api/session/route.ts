import { getAuth } from '@/lib/auth';
import { getAi } from '@/lib/ai';
import { errorResponse } from '@/lib/siwc-errors';
export async function GET(request:Request) { try { const auth=getAuth();auth.checkRequest(request);const identity=await auth.getIdentity();const status=await getAi().status();return Response.json({account:identity?.accountKey??null,name:identity?.name,provider:'chatgpt',aiMode:status.mode,canChat:status.canChat},{headers:{'Cache-Control':'no-store'}}); }catch(error){return errorResponse(error);} }
