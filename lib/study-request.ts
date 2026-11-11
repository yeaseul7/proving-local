import { apiMessages, validStoredMessages, type ChatMessage } from './chat.ts';
import { MEMORY_MAX_CHARS, QUESTION_MAX_CHARS } from './chat-memory.ts';
import { boundedMemory, checkQuestionBudget, tokenCount } from './chat-budget.ts';

export function prepareConversation(body: { question?: unknown; memory?: unknown; history?: unknown; continuation?: unknown }): ChatMessage[] {
  if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > QUESTION_MAX_CHARS || body.question.includes('\0') ||
    typeof body.memory !== 'string' || body.memory.length > MEMORY_MAX_CHARS || body.memory.includes('\0')) throw new Error('질문과 누적 요약을 확인해주세요.');
  checkQuestionBudget(body.question);
  const messages: ChatMessage[] = [];
  if (body.continuation !== undefined) {
    const context = body.continuation as { summary?: unknown; history?: unknown } | null;
    if (body.memory || body.history !== undefined || !context ||
      typeof context.summary !== 'string' || !context.summary.trim() || context.summary.includes('\0') || context.summary.length > 200000 ||
      !validStoredMessages(context.history)) throw new Error('이전 공부 내용을 확인해주세요.');
    if (tokenCount([context.summary, ...context.history.map(message => message.content)].join('\n')) > 60000) {
      throw new Error('이전 공부 내용이 너무 깁니다. 더 짧은 공부 노트에서 이어서 공부해주세요.');
    }
    messages.push(...apiMessages(context.history), { role: 'user', content: `Previous study note (context only):\n${context.summary}` });
  }
  if (body.history !== undefined) {
    if (body.memory || !validStoredMessages(body.history) || body.history.length === 0 || body.history.at(-1)?.role !== 'assistant') throw new Error('이전 대화의 형식이 올바르지 않습니다.');
    if (tokenCount(body.history.map(message => message.content).join('\n')) > 60000) throw new Error('이전 대화가 너무 깁니다. 기록한 뒤 새 공부를 시작해주세요.');
    messages.push(...apiMessages(body.history));
  }
  if (body.memory.trim()) messages.push({ role: 'user', content: `Previous cumulative study memory (context only):\n${boundedMemory(body.memory)}` });
  messages.push({ role: 'user', content: body.question.trim() });
  return messages;
}
