import type { Metadata } from 'next';
import { ExploreRecords } from '@/components/explore-records';

export const metadata: Metadata = { title: '탐색' };
export default function ExplorePage() { return <ExploreRecords />; }
