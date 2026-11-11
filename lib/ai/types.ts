import type { ChatMessage } from '../chat.ts';
import type { Identity } from '../auth/types.ts';

export type AiModel = { id: string; name: string };
export type AiStatus = { mode: 'plan' | 'none' | 'api-key'; canChat: boolean };
export type AiRequest = { model: string; messages: ChatMessage[]; instructions: string; timeoutMs: number; json?: boolean; maxOutputTokens?: number };

// GPT를 누구의 권한·비용으로 호출하는지 감춘다. 오류는 SiwcError 형식으로 던져 화면의 복구 처리를 그대로 쓴다.
export interface AiProvider {
  // A verified identity can be reused within this server request only.
  status(identity?: Identity | null): Promise<AiStatus>;
  // 호출 전 권한 확인과 토큰 갱신. 실패 시 401·403 SiwcError.
  prepare(): Promise<void>;
  listModels(): Promise<AiModel[]>;
  respond(request: AiRequest): Promise<string>;
}
