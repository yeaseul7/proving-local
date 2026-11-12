import { RecordComments } from '@/components/record-comments';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { connection } from 'next/server';
import { NoteReactions, SummaryViews } from '@/components/note-reactions';
import { StudyMarkdown } from '@/components/study-markdown';
import { SummaryAuthorChip } from '@/components/summary-author';
import { getPublicSummary } from '@/lib/public-summary';
import { summaryId, summaryPath, isCanonicalSummary } from '@/lib/summary-path';
import { summaryMetadata } from '@/lib/summary-metadata';
import { siteUrl } from '@/lib/site';

export const runtime = 'nodejs';
type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({params}:Props):Promise<Metadata> {
  await connection();
  const id=summaryId((await params).id);
  const record=id?await getPublicSummary(id):null;
  return record?summaryMetadata(record):{title:'요약을 찾을 수 없어요',robots:{index:false,follow:false}};
}

export default async function SummaryPage({ params }: Props) {
  await connection();
  const segment=(await params).id;
  const id=summaryId(segment);
  if (!id) notFound();
  const record = await getPublicSummary(id);
  if (!record) notFound();
  const path=summaryPath(record);
  if(!isCanonicalSummary(segment,record))permanentRedirect(path);
  const jsonLd={'@context':'https://schema.org','@type':'Article',headline:record.title,description:summaryMetadata(record).description,
    url:new URL(path,siteUrl).href,dateModified:record.updatedAt,
    author:record.author.name?{'@type':'Person',name:record.author.name}:undefined};
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,'\\u003c')}}/><section className="public-summary public-summary-in-app">
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
  </section></>;
}
