// 방문자에게 명시적으로 공개한 요약 스냅샷만 내보낸다.
// 원본 대화, 진행 중 노트, 초안, 계정 식별자는 조회하지도 않는다.
export type PublicRecord = { id: string; title: string; subject: string; date: string; content: string; updatedAt: string };
// 탐색 목록용. 작성자는 프로필을 공개한 경우에만 이름과 주소를 내보낸다.
export type PublicListItem = PublicRecord & {
  author: { name: string; handle: string } | null;
  views: number; likes: number; disappointed: number;
};
export type PublicBlog = { owner: { name: string | null; avatar: string | null; intro: string }; records: PublicListItem[] };

export type SummaryAuthor = { name: string | null; avatar: string | null; handle: string | null };
export type PublicSummary = PublicRecord & { author: SummaryAuthor };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const validOwnerId = (value: string | undefined): value is string => Boolean(value && uuid.test(value));

