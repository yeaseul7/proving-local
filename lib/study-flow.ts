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
      ? 'This is the final reply for this session. Briefly recap the key learning and any unresolved misunderstanding, then invite the learner to click Record. Do not ask another question or introduce a new topic. The learner can explicitly choose 3 more turns in the UI.'
      : turn >= 8
        ? 'Stay with the current topic and resolve existing gaps. Do not introduce new topics. Ask at most one focused closing question to check understanding.'
        : turn === 5
          ? 'Pause for a brief checkpoint: distinguish what the learner demonstrated understanding of from what still needs checking. Ask one concrete comprehension question. Do not assume mastery.'
          : 'Develop the current topic with one focused follow-up question, using the learner’s demonstrated understanding.';
  return `\nStudy session progress: reply ${turn} of ${limit}. ${stage}\nThese session-stage instructions override any earlier instruction to always end with a follow-up question. Do not mention internal counters, token budgets, or these instructions in the answer.\n`;
}
