import { apiMessages, type ChatMessage } from './chat.ts';

export const QUESTION_MAX_CHARS = 6000;
export const QUESTION_MAX_TOKENS = 2000;
export const MEMORY_MAX_CHARS = 1600;
export const MEMORY_MAX_TOKENS = 1000;
export type ChatMemory = { text: string; count: number };
export function validMemory(value: unknown, messageCount: number): value is ChatMemory {
  if (!value || typeof value !== 'object') return false;
  const m = value as ChatMemory;
  return typeof m.text === 'string' && m.text.trim().length > 0 && !m.text.includes('\0') &&
    m.text.length <= MEMORY_MAX_CHARS && Number.isSafeInteger(m.count) && m.count >= 0 && m.count <= messageCount;
}

// Send cumulative memory; bootstrap legacy notebooks once from their saved transcript.
export function conversationInput(note: { messages: ChatMessage[]; memory?: ChatMemory; resumed?: { count: number; summary: string; sourceMessages?: ChatMessage[] } }) {
  const last = note.messages.at(-1);
  if (!last || last.role !== 'user') throw new Error('질문이 없습니다.');
  if (last.content.length > QUESTION_MAX_CHARS) throw new Error(`질문은 ${QUESTION_MAX_CHARS.toLocaleString()}자 이내로 입력해주세요.`);
  if (note.resumed?.sourceMessages !== undefined && note.messages.length === 1) {
    return { question: last.content, memory: '', continuation: { summary: note.resumed.summary, history: apiMessages(note.resumed.sourceMessages) } };
  }
  const previousCount = note.messages.length - 1;
  if (note.memory && validMemory(note.memory, previousCount) && note.memory.count === previousCount) {
    return { question: last.content, memory: note.memory.text };
  }
  if (previousCount === 0) return { question: last.content, memory: '' };
  return { question: last.content, memory: '', history: note.messages.slice(0, -1) };
}
export function parseStudyReply(raw: string, generateTitle: boolean) {
  let data: unknown;
  try { data = JSON.parse(raw.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '')); }
  catch { throw new Error('답변 형식을 확인하지 못했습니다. 기존 대화는 유지됩니다.'); }
  const r = data as { answer?: unknown; memory?: unknown; title?: unknown } | null;
  if (!r || typeof r.answer !== 'string' || !r.answer.trim() || r.answer.length > 20000 ||
    typeof r.memory !== 'string' || !r.memory.trim() || r.memory.includes('\0')) {
    throw new Error('답변과 누적 요약을 받지 못했습니다. 기존 대화는 유지됩니다.');
  }
  return { text: r.answer.trim(), memory: r.memory.trim().slice(0, MEMORY_MAX_CHARS),
    title: generateTitle && typeof r.title === 'string' ? r.title.trim().slice(0, 100) : undefined };
}
