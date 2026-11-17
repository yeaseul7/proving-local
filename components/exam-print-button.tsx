'use client';
import {useState} from 'react';
import {flushSync} from 'react-dom';
import {createRoot,type Root} from 'react-dom/client';
import {useAccountSession} from './account-session';
import {StudyMarkdown} from './study-markdown';
import type {StudyExam,PublicExamContent} from '@/lib/study-exam';
type PrintMode='questions'|'answers';
function PrintableExam({exam,mode,english}:{exam:StudyExam|PublicExamContent;mode:PrintMode;english:boolean}){
 const middle=Math.ceil(exam.questions.length/2);
 return <section className="exam-paper" data-print-mode={mode}>
  <header className="exam-paper-heading"><h2>{exam.title}</h2><div className="exam-paper-info"><span>{exam.questions.length}{english?' questions':'문항'}</span><span>{mode==='answers'?(english?'Answers & explanations':'정답 및 해설'):(english?'Name: ______________':'이름: ______________')}</span></div></header>
  <p className="exam-paper-directions">{mode==='answers'?(english?'Answers and explanations for each question.':'문항별 정답과 해설입니다.'):(english?'Choose one answer for each question.':'각 문항에서 가장 알맞은 답 하나를 고르세요.')}</p>
  <div className="exam-paper-questions">{[0,middle].map(start=><div className="exam-paper-column" key={start}>{exam.questions.slice(start,start+middle).map((q,offset)=><article className="exam-question" key={start+offset}>
   <div className="exam-question-heading"><span className="exam-question-number">{String(start+offset+1).padStart(2,'0')}</span>{mode==='answers'&&<strong className="exam-print-answer">{english?'Answer':'정답'} {'correctIndex' in q&&typeof q.correctIndex==='number'?['①','②','③','④'][q.correctIndex]:''}</strong>}</div>
   {mode==='questions'?<><StudyMarkdown>{q.question}</StudyMarkdown><div className="exam-print-options">{q.options.map((option,i)=><div className="exam-option" key={i}><span className="exam-option-number">{['①','②','③','④'][i]}</span><StudyMarkdown>{option}</StudyMarkdown></div>)}</div></>:<div className="exam-print-explanation"><StudyMarkdown>{'explanation' in q&&typeof q.explanation==='string'?q.explanation:''}</StudyMarkdown></div>}
  </article>)}</div>)}</div>
  <footer className="exam-paper-footer">{mode==='answers'?(english?'End of answer key':'답지 끝'):(english?'End of exam':'시험지 끝')}</footer>
 </section>;
}
export function ExamPrintButton({exam,english,publicDownload=false}:{exam:StudyExam|PublicExamContent;english:boolean;publicDownload?:boolean}){
 const {getSession}=useAccountSession();
 const [busy,setBusy]=useState<PrintMode|null>(null),[error,setError]=useState(false);
 async function print(button:HTMLButtonElement,mode:PrintMode){
  if(publicDownload){try{const session=await getSession(true);if(!session.account){window.alert(english?'Please log in to download this exam.':'시험지를 다운로드하려면 로그인해주세요.');return;}}catch{window.alert(english?'Could not verify your login. Please try again.':'로그인 상태를 확인하지 못했습니다. 다시 시도해주세요.');return;}}
  const source=button.closest('.exam-workspace,.public-exam-preview')?.querySelector<HTMLElement>('.exam-paper');
  if(!source||busy)return;
  setBusy(mode);setError(false);
  const title=exam.title.trim()||(english?'Exam':'시험지');
  const printTitle=mode==='answers'?`${title} - ${english?'Answer key':'답지'}`:title;
  const frame=document.createElement('iframe');frame.title=printTitle;frame.dataset.examPrint=mode;
  let previousTitle:string|undefined,cleanupTimer:ReturnType<typeof setTimeout>|undefined,root:Root|undefined;
  const cleanup=()=>{
   if(previousTitle!==undefined&&document.title===printTitle)document.title=previousTitle;
   previousTitle=undefined;if(cleanupTimer)clearTimeout(cleanupTimer);
   window.removeEventListener('afterprint',cleanup);root?.unmount();root=undefined;frame.remove();
  };
  frame.style.cssText=`position:fixed;left:-10000px;top:0;width:${window.innerWidth}px;height:${window.innerHeight}px;border:0`;
  document.body.append(frame);
  try{
   const doc=frame.contentDocument,win=frame.contentWindow;if(!doc||!win)throw new Error();
   doc.open();doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');doc.close();doc.title=printTitle;
   for(const attribute of Array.from(document.documentElement.attributes))doc.documentElement.setAttribute(attribute.name,attribute.value);
   doc.documentElement.dataset.theme='light';
   const base=doc.createElement('base');base.href=document.baseURI;doc.head.append(base);
   document.querySelectorAll('style,link[rel="stylesheet"]').forEach(node=>doc.head.append(node.cloneNode(true)));
   const width=source.getBoundingClientRect().width,mount=doc.createElement('div');mount.style.width=`${width}px`;doc.body.append(mount);
   root=createRoot(mount);
   // 개인 답안·채점 결과·메모를 참조하지 않고 원본 문제 데이터만 출력한다.
   flushSync(()=>root!.render(<PrintableExam exam={exam} mode={mode} english={english}/>));
   await Promise.all(Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(link=>link.sheet?Promise.resolve():new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error()),10000);
    link.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});link.addEventListener('error',()=>{clearTimeout(timer);reject(new Error());},{once:true});
   })));
   await doc.fonts.ready;
   const paper=mount.querySelector<HTMLElement>('.exam-paper')!;
   const grid=paper.querySelector('.exam-paper-questions');
   const dividerDisplay=grid?win.getComputedStyle(grid,'::before').display:'none';
   // 인쇄 매체의 폭이 달라져도 현재 화면의 단 구성과 글꼴을 유지한다.
   for(const element of [paper,...paper.querySelectorAll<HTMLElement>('*')]){
    const computed=win.getComputedStyle(element),values=Array.from(computed).map(property=>[property,computed.getPropertyValue(property)] as const);
    for(const [property,value] of values)element.style.setProperty(property,value,'important');
    if(element.matches('.exam-paper,.exam-paper-heading,.exam-paper-info,.exam-paper-directions,.exam-paper-questions,.exam-paper-column,.exam-question,.exam-question-heading,.reading-text,.code-block,.code-toolbar,pre,.exam-option,.exam-paper-footer,.exam-print-options,.exam-print-explanation,p,ul,ol,li')){
     element.style.setProperty('height','auto','important');element.style.setProperty('block-size','auto','important');
    }
   }
   paper.querySelectorAll<HTMLElement>('.code-toolbar button').forEach(element=>element.style.setProperty('display','none','important'));
   paper.querySelectorAll<HTMLElement>('pre,pre code').forEach(element=>{
    element.style.setProperty('white-space','pre-wrap','important');element.style.setProperty('overflow-wrap','anywhere','important');element.style.setProperty('overflow','visible','important');
   });
   const printableWidth=(210-24)*96/25.4;
   paper.style.setProperty('width',`${width}px`,'important');paper.style.setProperty('margin','0','important');paper.style.setProperty('zoom',String(printableWidth/width),'important');
   mount.style.width=`${printableWidth}px`;
   (grid as HTMLElement|null)?.style.setProperty('grid-template-rows','auto','important');
   const style=doc.createElement('style');style.textContent=`@page{size:A4;margin:12mm}html,body{margin:0!important;padding:0!important;width:${printableWidth}px!important;min-width:0!important;background:#fff!important;color:#272a30!important;color-scheme:light!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;animation:none!important;transition:none!important}.exam-paper-questions::before{display:${dividerDisplay}!important}`;doc.head.append(style);
   paper.getBoundingClientRect();previousTitle=document.title;document.title=printTitle;
   win.addEventListener('afterprint',cleanup,{once:true});window.addEventListener('afterprint',cleanup,{once:true});cleanupTimer=setTimeout(cleanup,120000);win.focus();win.print();
  }catch{cleanup();setError(true);}finally{setBusy(null);}
 }
 return <span className="exam-print-control" role="group" aria-label={english?'PDF output':'PDF 출력'}>{(publicDownload?['questions'] as const:['questions','answers'] as const).map(mode=><button key={mode} type="button" className="button secondary" disabled={busy!==null} onClick={event=>void print(event.currentTarget,mode)}>{busy===mode?(english?'Preparing…':'준비 중…'):mode==='questions'?(publicDownload?(english?'Download exam PDF':'시험지 PDF 다운로드'):(english?'Print questions only':'문제만 출력')):(english?'Print answer key':'답지 출력')}</button>)}{error&&<span role="alert">{english?'Could not open print preview. Please try again.':'출력 화면을 열지 못했습니다. 다시 시도해주세요.'}</span>}</span>;
}
