import type { StudyNote } from './study.ts';
import type { Engagement } from './summary-engagement';

// 목록 응답은 CDN에 남아 있을 수 있으므로 상세 화면에서 확인한 수치를 우선한다.
type Counts = Pick<Engagement, 'views' | 'likes' | 'disappointed'>;
let snapshot: ReadonlyMap<string, Counts> = new Map();
const emptySnapshot: ReadonlyMap<string, Counts> = new Map();
const listeners = new Set<() => void>();

export function publishSummaryEngagement(id: string, counts: Counts) {
  snapshot = new Map(snapshot).set(id, {
    views: counts.views, likes: counts.likes, disappointed: counts.disappointed,
  });
  for (const listener of listeners) listener();
}

export function subscribeSummaryEngagement(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const getSummaryEngagement = () => snapshot;
export const getServerSummaryEngagement = () => emptySnapshot;

// 서버 기록의 조회수는 공개 요약 집계만 사용한다. 예전 브라우저 열람 횟수는 섞지 않는다.
export function studyNoteViews(note: Pick<StudyNote, 'cloud' | 'publicId' | 'views'>, counts: ReadonlyMap<string, Counts>): number {
  if (!note.cloud) return note.views ?? 0;
  if (!note.publicId) return 0;
  return Math.max(note.views ?? 0, counts.get(note.publicId)?.views ?? 0);
}
