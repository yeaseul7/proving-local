export type Profile = { handle: string | null; displayName: string | null; avatar: string | null; intro: string; isPublic: boolean };
export type ProfileInput = Pick<Profile, 'displayName' | 'avatar' | 'intro'>;
export type PublicProfile = { handle: string; displayName: string; avatar: string | null; intro: string; updatedAt: string; counts: Record<string, number>; page: number; totalRecords: number; selectedDay: string | null; records: { id: string; title: string; subject: string; date: string; views: number; likes: number; disappointed: number }[] };

export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
export const NAME_MAX = 40;
export const INTRO_MAX = 500;
// 프로필 사진은 브라우저에서 256px로 줄인 data URL로 저장한다. SVG는 받지 않는다.
export const AVATAR_SIZE = 256;
export const AVATAR_MAX = 200_000;
export const AVATAR_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export const EMPTY_PROFILE: Profile = { handle: null, displayName: null, avatar: null, intro: '', isPublic: false };

// 편집 화면에서 바꿀 수 있는 이름·사진·설명만 정리한다. 실패 시 사용자에게 보여줄 문구를 반환한다.
export function parseProfileInput(input: unknown): ProfileInput | string {
  if (!input || typeof input !== 'object') return '프로필 입력이 올바르지 않습니다.';
  const { displayName, avatar, intro } = input as Record<string, unknown>;
  if (displayName != null && typeof displayName !== 'string') return '이름이 올바르지 않습니다.';
  if (avatar != null && typeof avatar !== 'string') return '프로필 사진이 올바르지 않습니다.';
  if (typeof intro !== 'string') return '프로필 입력이 올바르지 않습니다.';
  const cleanName = displayName?.trim() || null;
  const cleanAvatar = avatar || null;
  if (cleanName && Array.from(cleanName).length > NAME_MAX) return `이름은 ${NAME_MAX}자까지 쓸 수 있어요.`;
  if (cleanAvatar && (cleanAvatar.length > AVATAR_MAX || !AVATAR_PATTERN.test(cleanAvatar))) return '프로필 사진은 JPG·PNG·WebP 이미지만 올릴 수 있어요.';
  if (Array.from(intro).length > INTRO_MAX) return `설명은 ${INTRO_MAX}자까지 쓸 수 있어요.`;
  return { displayName: cleanName, avatar: cleanAvatar, intro };
}

// meta description용 평문. Markdown 기호·코드·수식을 걷어내고 길이를 제한한다.
export function introDescription(markdown: string, max = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[`*_~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max - 1).join('').trimEnd()}…` : text;
}

// 공유 설정은 프로필 편집과 분리하고 내부 사용자 ID나 공개 ID를 입력받지 않는다.
export function parseProfileSharing(input: unknown): { isPublic: boolean } | string {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
    Object.keys(input).length !== 1 || typeof (input as { isPublic?: unknown }).isPublic !== 'boolean') {
    return '공개 여부만 지정해주세요.';
  }
  return { isPublic: (input as { isPublic: boolean }).isPublic };
}

export const PUBLIC_PROFILE_PAGE_SIZE = 10;

export function parsePublicProfilePage(value: unknown): number {
  const page = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function parsePublicProfileDay(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}
