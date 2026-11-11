import { RecordComments } from '@/components/record-comments';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { NoteReactions, SummaryViews } from '@/components/note-reactions';
import { StudyMarkdown } from '@/components/study-markdown';
import { SummaryAuthorChip } from '@/components/summary-author';
import { getPublicSummary } from '@/lib/public-summary';
import { validOwnerId } from '@/lib/public-blog';

export const runtime = 'nodejs';
export const metadata: Metadata = { title: '공개 공부 요약', robots: { index: false, follow: false } };

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!validOwnerId(id)) notFound();
  const record = await getPublicSummary(id);
  if (!record) notFound();
  return <section className="public-summary public-summary-in-app">
    <Link href="/explore" className="text-button">← 탐색</Link>
    <article>
      <header><h1>{record.title}</h1>
        {/* 작성자 · 날짜 · 조회수를 한 줄로 */}
        <div className="summary-byline"><SummaryAuthorChip author={record.author}/><time dateTime={record.date}>{record.date}</time><SummaryViews publicId={record.id}/></div>
      </header>
      <div className="note-content"><StudyMarkdown>{record.content}</StudyMarkdown></div>
      <NoteReactions noteId={record.id} publicId={record.id} showViews={false} language="ko"/>
      <RecordComments publicId={record.id}/>
    </article>
  </section>;
}
