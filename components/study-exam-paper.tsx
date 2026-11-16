'use client';
import { useState } from 'react';
import { useAccountSession } from './account-session';
import { useLanguage } from './language-provider';
import { StudyMarkdown } from './study-markdown';
import { examScore,EXAM_QUESTION_COUNT,type ExamAttempt } from '@/lib/study-exam';
function PencilMark({correct}:{correct:boolean}){
 return <svg className="exam-pencil-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true"><g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">{correct?<><path d="M35 8C24 2 10 8 7 21c-3 13 5 21 17 21 12 0 19-9 18-20C41 12 35 7 25 6" strokeWidth="2.8" opacity=".8"/><path d="M33 6C20 3 8 12 8 26c0 10 9 17 19 15 12-2 18-16 11-27" strokeWidth="1.2" opacity=".45"/></>:<><path d="M35 7 12 40" strokeWidth="3.4" opacity=".8"/><path d="M38 8 15 41M32 8 10 38" strokeWidth="1.1" opacity=".4"/></>}</g></svg>;
}
export function StudyExamPaper({attempt,onChange,onMemoClose,disabled=false}:{attempt:ExamAttempt;onChange:(next:ExamAttempt,kind?:'answer'|'memo')=>void;onMemoClose?:()=>void;disabled?:boolean}){
 const {session}=useAccountSession();const {language}=useLanguage();const en=language==='en',score=examScore(attempt.exam,attempt.answers);
 return <section className="exam-paper" aria-label={en?'Exam questions':'시험 문제'}>
  <header className="exam-paper-heading"><h2>{attempt.exam.title}</h2><div className="exam-paper-info"><span>{new Date(attempt.createdAt).toLocaleDateString(en?'en-US':'ko-KR')}</span><span>{EXAM_QUESTION_COUNT}{en?' questions · 10 points each':'문항 · 문항당 10점'}</span><span>{en?'Name':'이름'} <b>{session?.name||(en?'Learner':'학습자')}</b></span></div>{attempt.submitted&&<div className="exam-score" role="status"><span>{en?'Score':'채점 결과'}</span><strong>{score*10}<small>/ 100</small></strong><span>{score} / {EXAM_QUESTION_COUNT}</span></div>}</header>
  <p className="exam-paper-directions">{en?'Choose one answer for each question. Record your reasoning or questions in the memo area.':'각 문항에서 가장 알맞은 답 하나를 고르세요. 풀이 과정이나 궁금한 점은 문제 아래에 메모하세요.'}</p>
  <div className="exam-paper-questions">{[0,5].map(start=><div className="exam-paper-column" key={start}>{attempt.exam.questions.slice(start,start+5).map((q,offset)=>{
   const i=start+offset;
   const correct=attempt.answers[i]===q.correctIndex;
   const feedback=attempt.exam.memoFeedback?.find(f=>f.questionIndex===i&&f.memo===attempt.memos[i]);
   return <article key={i} className={`exam-question ${attempt.submitted?(correct?'is-correct':'is-incorrect'):''}`}>
    <div className="exam-question-heading"><span className="exam-question-number">{String(i+1).padStart(2,'0')}</span><span className="exam-question-source">{attempt.sources.find(source=>source.id===q.sourceId)?.title}</span><small>10{en?' pts':'점'}</small>{attempt.submitted&&<span className="exam-mark" aria-label={correct?(en?'Correct':'정답'):(en?'Incorrect':'오답')}><PencilMark correct={correct}/></span>}</div>
    <StudyMarkdown>{q.question}</StudyMarkdown>
    <fieldset disabled={disabled||attempt.submitted}><legend className="exam-answer-legend">{en?`Question ${i+1} answer`:`${i+1}번 답 선택`}</legend>{q.options.map((option,j)=><label key={j} className={`exam-option ${attempt.submitted?(j===q.correctIndex?'is-answer':attempt.answers[i]===j?'is-wrong-choice':''):''}`}><input type="radio" name={`exam-${attempt.id}-${i}`} checked={attempt.answers[i]===j} onChange={()=>onChange({...attempt,answers:attempt.answers.map((answer,index)=>index===i?j:answer)})}/><span className="exam-option-number">{['①','②','③','④'][j]}{attempt.answers[i]===j&&<svg className="exam-choice-check" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 11 6 7L22 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span><StudyMarkdown>{option}</StudyMarkdown>{attempt.submitted&&(j===q.correctIndex||attempt.answers[i]===j)&&<span className="exam-choice-label">{j===q.correctIndex?(en?'Answer':'정답'):(en?'My answer':'내 답')}</span>}</label>)}</fieldset>
    <ExamMemo key={`${attempt.id}-${i}`} value={attempt.memos[i]??''} disabled={disabled} english={en} onClose={onMemoClose} onChange={value=>onChange({...attempt,memos:attempt.memos.map((memo,index)=>index===i?value:memo)},'memo')}/>
    {attempt.submitted&&<div className="exam-feedback"><strong>{correct?(en?'Correct':'정답'):(en?'Incorrect':'오답')} · {en?'Answer':'정답'} {['①','②','③','④'][q.correctIndex]}</strong><StudyMarkdown>{q.explanation}</StudyMarkdown>{feedback&&<div className="exam-memo-feedback"><strong>{en?'Explanation based on your notes':'메모 기반 추가 해설'}</strong><StudyMarkdown>{feedback.text}</StudyMarkdown></div>}</div>}
   </article>;
  })}</div>)}</div><footer className="exam-paper-footer">PROVING · {en?'End of exam':'시험지 끝'}</footer>
 </section>;
}

function ExamMemo({value,onChange,onClose,disabled,english}:{value:string;onChange:(value:string)=>void;onClose?:()=>void;disabled:boolean;english:boolean}){
 const [open,setOpen]=useState(()=>Boolean(value.trim()));
 const label=english?'Notes / questions':'메모 / 질문';
 return <details className="exam-memo" open={open} onToggle={event=>{const next=event.currentTarget.open;setOpen(next);if(open&&!next)onClose?.();}}><summary><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>{label}</summary><textarea aria-label={label} rows={3} maxLength={5000} value={value} disabled={disabled} onChange={event=>onChange(event.target.value)} placeholder={english?'Your reasoning or questions…':'풀이 과정이나 궁금한 점을 적어보세요.'}/></details>;
}
