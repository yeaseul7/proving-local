import type { ChatMessage } from './chat.ts';
import type { AiRequest } from './ai/types.ts';
import { tokenCount } from './chat-budget.ts';

type Respond = (options: Pick<AiRequest, 'messages' | 'instructions' | 'maxOutputTokens'>) => Promise<string>;
// 구간 추출은 내부 통합 자료다. 최종 노트의 읽기 시간·두 섹션 제약을 적용하지 않는다.
const SEGMENT_INSTRUCTIONS = `Extract evidence from this transcript segment for later consolidation, not a reader-facing study note.
Preserve every distinct learned concept, accuracy-critical condition/exception, and at most one useful short example per complex concept.
Separate learner-demonstrated understanding, learner misconceptions, explicit corrections with evidence of resolution, unresolved questions, and unverified understanding.
Keep relevant learner statements and their relative order as internal evidence. An AI explanation or a learner's simple agreement is not proof of mastery.
A correction may occur in a later segment: mark uncertain status rather than declaring it resolved or permanently unresolved. Do not invent missing context.
Do not apply the final note's two-section or 1–2 minute reading target here. Omit repetition but retain evidence needed to decide the final understanding state.`;
// 기록은 원본을 사용한다. 긴 원문만 구간별로 정리하고 최종 통합한다.
export async function summarizeTranscript(messages: ChatMessage[], instructions: string, respond: Respond, depth = 0): Promise<string> {
  if (tokenCount(messages.map(message => message.content).join('\n')) <= 24000) {
    return respond({ messages, instructions, maxOutputTokens: 4096 });
  }
  if (depth >= 3) throw new Error('대화가 너무 길어 요약을 통합하지 못했습니다. 원본은 유지됩니다.');
  const pieces: ChatMessage[] = [];
  for (const message of messages) {
    const chars = Array.from(message.content);
    for (let offset = 0; offset < chars.length; offset += 3000) pieces.push({ role: message.role, content: chars.slice(offset, offset + 3000).join('') });
  }
  const partials: string[] = [];
  let batch: ChatMessage[] = [];
  let count = 0;
  const flush = async () => {
    if (!batch.length) return;
    partials.push(await respond({ messages: batch, instructions: SEGMENT_INSTRUCTIONS, maxOutputTokens: 2048 }));
    batch = []; count = 0;
  };
  for (const piece of pieces) {
    const size = tokenCount(piece.content);
    if (count + size > 16000) await flush();
    batch.push(piece); count += size;
  }
  await flush();
  // 통합 입력도 같은 예산으로 다시 검사한다.
  return summarizeTranscript([{ role: 'user', content: 'Merge these transcript segment notes without adding facts:\n\n' + partials.map((partial,index) => `[Segment ${index + 1}]\n${partial}`).join('\n\n---\n\n') }], instructions, respond, depth + 1);
}
