'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from './language-provider';
import {ExamPrintButton} from './exam-print-button';
import {StudyMarkdown} from './study-markdown';
import {introDescription} from '@/lib/profile';
import type {PublicExamContent,PublicExamListItem} from '@/lib/study-exam';
export function ExploreExams({query}:{query:string}){
 const {language}=useLanguage(),en=language==='en';
 const [page,setPage]=useState({query:'',offset:0}),[items,setItems]=useState<PublicExamListItem[]>([]),[hasMore,setHasMore]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0),[selected,setSelected]=useState<string|null>(null);
 const offset=page.query===query?page.offset:0;
 useEffect(()=>{setPage({query,offset:0});setSelected(null);},[query]);
 useEffect(()=>{
  const controller=new AbortController();let active=true;setLoading(true);setError('');
  const timer=setTimeout(()=>{
   fetch(`/api/public/exams?q=${encodeURIComponent(query.trim())}&offset=${offset}`,{cache:'no-store',signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok||!Array.isArray(data.exams))throw new Error(en?'Could not load exams.':'시험지를 불러오지 못했습니다.');if(active){setItems(data.exams);setHasMore(!!data.hasMore);}}).catch(error=>{if(active)setError(error.message);}).finally(()=>{if(active)setLoading(false);});
  },query?250:0);
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[query,offset,retry,en]);
 if(selected)return <PublicExamPreview key={selected} id={selected} onBack={()=>{setSelected(null);setRetry(n=>n+1);}}/>;
 return <section aria-label={en?'Public exams':'공개 시험지'}>
  {loading?<p role="status">{en?'Loading exams…':'시험지를 불러오는 중'}</p>:error?<p role="alert">{error} <button type="button" className="text-button" onClick={()=>setRetry(n=>n+1)}>{en?'Retry':'다시 시도'}</button></p>:items.length?<div className="explore-profiles">{items.map(item=><button type="button" key={item.id} className="explore-profile-card explore-summary-card explore-exam-card" onClick={()=>setSelected(item.id)}>
   <h3>{item.title}</h3><p className="explore-summary-preview">{introDescription(item.preview,120)}</p><div className="explore-summary-meta"><small>{item.author} · <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(en?'en-US':'ko-KR')}</time></small><small>{en?'10 questions':'10문항'}</small></div>
  </button>)}</div>:<div className="explore-empty"><h3>{query?(en?'No matching exams':'찾는 시험지가 없어요'):(en?'No public exams yet':'아직 공개된 시험지가 없어요')}</h3><p>{query?(en?'Try another search.':'다른 단어로 검색해보세요.'):(en?'Published exams appear here.':'시험지를 공개하면 이곳에 표시됩니다.')}</p></div>}
  {!loading&&!error&&(offset>0||hasMore)&&<nav className="exam-pagination" aria-label={en?'Public exam pages':'공개 시험지 페이지'}><button type="button" disabled={offset===0} onClick={()=>setPage({query,offset:offset-10})}>{en?'Previous':'이전'}</button><span>{offset/10+1}</span><button type="button" disabled={!hasMore} onClick={()=>setPage({query,offset:offset+10})}>{en?'Next':'다음'}</button></nav>}
 </section>;
}
function PublicExamPreview({id,onBack}:{id:string;onBack:()=>void}){
 const {language}=useLanguage(),en=language==='en';
 const [exam,setExam]=useState<PublicExamContent|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;const controller=new AbortController();setError('');
  fetch(`/api/public/exams/${id}`,{cache:'no-store',signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(response.status===404?(en?'This exam is private or no longer exists.':'비공개로 전환되었거나 삭제된 시험지입니다.'):(en?'Could not load exam.':'시험지를 불러오지 못했습니다.'));if(!data.exam?.questions)throw new Error('시험지 형식을 확인하지 못했습니다.');if(active)setExam(data.exam);}).catch(error=>{if(active)setError(error.message);});
  return()=>{active=false;controller.abort();};
 },[id,retry,en]);
 return <section className="public-exam-preview"><div className="public-exam-toolbar"><button type="button" className="text-button" onClick={onBack}>← {en?'Public exams':'공개 시험지 목록'}</button>{exam&&!error&&<ExamPrintButton exam={exam} english={en} publicDownload/>}</div>
  {error?<p role="alert">{error} <button type="button" className="text-button" onClick={()=>setRetry(n=>n+1)}>{en?'Retry':'다시 시도'}</button></p>:!exam?<p role="status">{en?'Loading exam…':'시험지를 불러오는 중'}</p>:<><section className="exam-paper" aria-label={en?'Exam preview':'시험지 미리보기'}>
   <header className="exam-paper-heading"><h2>{exam.title}</h2><div className="exam-paper-info"><span>{en?'Public exam · 10 questions':'공개 시험지 · 10문항'}</span></div></header>
   <div className="exam-paper-questions">{[0,5].map(start=><div className="exam-paper-column" key={start}>{exam.questions.slice(start,start+5).map((q,i)=><article className="exam-question" key={i}><div className="exam-question-heading"><span className="exam-question-number">{String(start+i+1).padStart(2,'0')}</span></div><StudyMarkdown>{q.question}</StudyMarkdown>{q.options.map((option,j)=><div className="exam-option" key={j}><span className="exam-option-number">{['①','②','③','④'][j]}</span><StudyMarkdown>{option}</StudyMarkdown></div>)}</article>)}</div>)}</div>
  </section></>}
 </section>;
}
