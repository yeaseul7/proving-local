'use client';
import { useState } from 'react';
import { useLanguage } from './language-provider';
import { ExploreSummaries } from './explore-summaries';
import { ExploreExams } from './explore-exams';
export function ExploreRecords() {
 const {language}=useLanguage(),en=language==='en';
 const [category,setCategory]=useState<'notes'|'exams'>('notes'),[query,setQuery]=useState('');
 return <section aria-labelledby="explore-title">
  <header className="page-heading"><div><h1 id="explore-title">{en?'Explore':'탐색'}</h1></div></header>
  <label className="explore-search">
   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
   <input type="search" aria-label={category==='notes'?(en?'Search study notes':'공부 기록 검색'):(en?'Search exams':'시험지 검색')} value={query} onChange={e=>setQuery(e.target.value)} placeholder={category==='notes'?(en?'Search by title, topic or content':'제목, 주제, 내용으로 검색'):(en?'Search exam titles or questions':'시험 제목, 문제로 검색')}/>
  </label>
  <div className="explore-category-chips" role="group" aria-label={en?'Explore categories':'탐색 카테고리'}>
   <button type="button" aria-pressed={category==='notes'} onClick={()=>setCategory('notes')}>{en?'Study notes':'공부 기록'}</button>
   <button type="button" aria-pressed={category==='exams'} onClick={()=>setCategory('exams')}>{en?'Exams':'시험지'}</button>
  </div>
  {category==='notes'?<ExploreSummaries query={query}/>:<ExploreExams query={query}/>}
 </section>;
}
