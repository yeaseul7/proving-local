'use client';
import Link from 'next/link';
import type { SummaryAuthor } from '@/lib/public-blog';

// 공개 요약의 작성자. 프로필을 공개했으면 그 프로필로 이동하고, 비공개면 알림만 띄운다.
export function SummaryAuthorChip({ author }: { author: SummaryAuthor }) {
  const name = author.name || '작성자';
  const body = <>
    {author.avatar
      // data URL이라 next/image 최적화가 필요 없다.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img className="summary-author-avatar" src={author.avatar} alt="" width={24} height={24}/>
      : <span className="summary-author-avatar summary-author-initial" aria-hidden="true">{Array.from(name.trim())[0]?.toUpperCase() ?? '?'}</span>}
    <span className="summary-author-name">{name}</span>
  </>;
  return author.handle
    ? <Link className="summary-author" href={`/u/${author.handle}`} aria-label={`${name}님의 프로필 보기`}>{body}</Link>
    : <button type="button" className="summary-author" aria-label={`${name}님의 프로필 (비공개)`} onClick={() => window.alert('비공개 프로필이에요.')}>{body}</button>;
}
