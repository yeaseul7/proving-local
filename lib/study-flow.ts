import type { ChatMessage } from './chat.ts';

export const STUDY_TURN_LIMIT = 10;
export const STUDY_TURN_EXTENSION = 3;
// 원본 대화 저장 한도(101개 메시지) 안에서 이어 공부의 시작 메시지도 보관한다.
export const MAX_STUDY_TURN_LIMIT = 49;
export type StudyFlow = { turn: number; limit: number };

export function validStudyTurnLimit(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= STUDY_TURN_LIMIT &&
    (value as number) <= MAX_STUDY_TURN_LIMIT && ((value as number) - STUDY_TURN_LIMIT) % STUDY_TURN_EXTENSION === 0;
}

export function completedStudyTurns(note: { messages: ChatMessage[]; resumed?: { count: number } }): number {
  let count = 0, pending = false;
  for (const message of note.messages.slice(note.resumed?.count ?? 0)) {
    if (message.role === 'user') pending = true;
    else if (pending) { count++; pending = false; }
  }
  return count;
}

export function parseStudyFlow(value: unknown): StudyFlow {
  if (value === undefined) return { turn: 1, limit: STUDY_TURN_LIMIT };
  const flow = value as StudyFlow | null;
  if (!flow || !validStudyTurnLimit(flow.limit) || !Number.isSafeInteger(flow.turn) || flow.turn < 0 || flow.turn > flow.limit) {
    throw new Error('대화 횟수를 확인해주세요. 기록하거나 3회 더 공부하기를 선택해주세요.');
  }
  return { turn: flow.turn, limit: flow.limit };
}

export function studyFlowInstructions({ turn, limit }: StudyFlow): string {
  const stage = turn === 0
    ? 'This is the automatic opening of a continued study session; do not count it as a completed study turn.'
    : turn >= limit
      ? 'This is the final reply within the current turn allowance, not a forced end to learning. Answer the current learner question FIRST. Then briefly recap key learning and unresolved or unverified concepts. Naturally offer the existing Record action and the option of 3 more turns if the learner wants to continue. Do not ask another question merely to propose recording, and do not introduce an unrelated topic or claim learning is complete. Do not require immediate recording.'
      : turn === 5
        ? 'Consider a brief checkpoint: distinguish demonstrated understanding from unverified abilities, but answer the current learner question FIRST. Skip a separate check when understanding is already sufficiently evidenced; ask at most one only if useful. This reminder does not require a question or raising difficulty.'
        : 'Follow the adaptive learning policy using evidence, not the turn number. Answer the current question first; do not force checks, difficulty increases, or a closing phase to fill turns.';
  return `\nStudy session progress: reply ${turn} of ${limit}. ${stage}\nThese session-stage instructions override any earlier instruction to always end with a follow-up question, but never override technical accuracy or answering the current question. Do not mention internal counters, token budgets, or these instructions in the answer.\n`;
}
