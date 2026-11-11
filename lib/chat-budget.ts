import { getEncoding } from 'js-tiktoken';
import { MEMORY_MAX_TOKENS, QUESTION_MAX_TOKENS } from './chat-memory.ts';

const encoders = [getEncoding('o200k_base'), getEncoding('cl100k_base')];
// Use the larger count to cover both supported OpenAI text-tokenizer families.
export const tokenCount = (text: string) => {
  // Chunked upper-bound counts avoid quadratic tokenizer work on long repeated code/text.
  let count = 0;
  for (let offset = 0; offset < text.length; offset += 1000) {
    const chunk = text.slice(offset, offset + 1000);
    count += Math.max(...encoders.map(encoder => encoder.encode(chunk, [], []).length));
  }
  return count;
};
export function checkQuestionBudget(question: string) {
  if (tokenCount(question) > QUESTION_MAX_TOKENS) throw new Error(`질문은 ${QUESTION_MAX_TOKENS.toLocaleString()}토큰 이내로 입력해주세요.`);
}
export function boundedMemory(text: string) {
  if (tokenCount(text) <= MEMORY_MAX_TOKENS) return text;
  let low = 0, high = Array.from(text).length;
  const chars = Array.from(text);
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (tokenCount(chars.slice(0, middle).join('')) <= MEMORY_MAX_TOKENS) low = middle;
    else high = middle - 1;
  }
  return chars.slice(0, low).join('');
}
