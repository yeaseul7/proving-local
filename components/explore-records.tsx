'use client';
import { useLanguage } from './language-provider';
import { ExploreSummaries } from './explore-summaries';

export function ExploreRecords() {
  const { language } = useLanguage();
  return <section aria-labelledby="explore-title">
    <header className="page-heading">
      <div>
        <h1 id="explore-title">{language === 'en' ? 'Explore' : '탐색'}</h1>
        <p>{language === 'en' ? 'Discover public study notes.' : '공개된 공부 기록을 둘러보세요.'}</p>
      </div>
    </header>
    <ExploreSummaries />
  </section>;
}
