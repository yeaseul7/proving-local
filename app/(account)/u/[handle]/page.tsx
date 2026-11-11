import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { PublicProfileOverview } from '@/components/public-profile-overview';
import { introDescription, parsePublicProfilePage, parsePublicProfileDay } from '@/lib/profile';
import { getPublicProfile, seoulToday } from '@/lib/public-profile';
import { siteUrl } from '@/lib/site';

export const runtime = 'nodejs';

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<{ page?: string | string[]; day?: string | string[] }> };
const shareImage = { url: '/proving-logo.png', width: 1306, height: 428, alt: 'proving' };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  await connection();
  const query = await searchParams;
  const profile = await getPublicProfile((await params).handle, parsePublicProfilePage(query.page), parsePublicProfileDay(query.day));
  if (!profile) return { title: '프로필을 찾을 수 없어요', robots: { index: false, follow: false } };
  const title = `${profile.displayName} (@${profile.handle})`;
  const description = introDescription(profile.intro) || `${profile.displayName}님의 proving 공부 기록`;
  const path = `/u/${profile.handle}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'profile', url: path, siteName: 'proving', locale: 'ko_KR', title, description, username: profile.handle, images: [shareImage] },
    twitter: { card: 'summary', title, description, images: [shareImage.url] },
  };
}

export default async function PublicProfilePage({ params, searchParams }: Props) {
  await connection();
  const query = await searchParams;
  const profile = await getPublicProfile((await params).handle, parsePublicProfilePage(query.page), parsePublicProfileDay(query.day));
  if (!profile) notFound();
  const url = new URL(`/u/${profile.handle}`, siteUrl).href;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url,
    dateModified: profile.updatedAt,
    mainEntity: {
      '@type': 'Person',
      name: profile.displayName,
      alternateName: `@${profile.handle}`,
      description: introDescription(profile.intro, 300) || undefined,
      url,
    },
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <PublicProfileOverview profile={profile} today={seoulToday()} />
  </>;
}
