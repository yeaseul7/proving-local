'use client';
import {useState} from 'react';
export function ExamPrintButton({title,english}:{title:string;english:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(false);
 async function print(button:HTMLButtonElement){
  const source=button.closest('.exam-workspace')?.querySelector<HTMLElement>('.exam-paper');
  if(!source||busy)return;
  setBusy(true);setError(false);
  const printTitle=title.trim()||(english?'Exam':'시험지');
  const frame=document.createElement('iframe');
  frame.title=printTitle;frame.dataset.examPrint='';
  let previousTitle:string|undefined;
  let cleanupTimer:ReturnType<typeof setTimeout>|undefined;
  const cleanup=()=>{
   if(previousTitle!==undefined&&document.title===printTitle)document.title=previousTitle;
   previousTitle=undefined;
   if(cleanupTimer)clearTimeout(cleanupTimer);
   window.removeEventListener('afterprint',cleanup);
   frame.remove();
  };
  frame.style.cssText=`position:fixed;left:-10000px;top:0;width:${window.innerWidth}px;height:${window.innerHeight}px;border:0`;
  document.body.append(frame);
  try{
   const doc=frame.contentDocument,win=frame.contentWindow;if(!doc||!win)throw new Error();
   doc.open();doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');doc.close();
   doc.title=printTitle;
   for(const attribute of Array.from(document.documentElement.attributes))doc.documentElement.setAttribute(attribute.name,attribute.value);
   doc.documentElement.dataset.theme='light';
   const base=doc.createElement('base');base.href=document.baseURI;doc.head.append(base);
   document.querySelectorAll('style,link[rel="stylesheet"]').forEach(node=>doc.head.append(node.cloneNode(true)));
   const paper=source.cloneNode(true) as HTMLElement;
   const originals=[source,...source.querySelectorAll<HTMLElement>('*')];
   const copies=[paper,...paper.querySelectorAll<HTMLElement>('*')];
   doc.body.append(paper);
   await Promise.all(Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(link=>link.sheet?Promise.resolve():new Promise<void>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error()),10000);
    link.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});
    link.addEventListener('error',()=>{clearTimeout(timer);reject(new Error());},{once:true});
   })));
   await doc.fonts.ready;
   // 테마 색상만 라이트모드에서 측정한다. 원래 화면의 레이아웃은 그대로 복사한다.
   const isPaint=(property:string)=>property.includes('color')||property.startsWith('--')||['background-image','fill','stroke','box-shadow','text-shadow'].includes(property);
   const lightPaint=copies.map(copy=>{
    const computed=win.getComputedStyle(copy);
    return new Map(Array.from(computed).filter(isPaint).map(property=>[property,computed.getPropertyValue(property)]));
   });
   // 단 구성과 글자 크기는 현재 화면, 배경과 글자 색상은 라이트모드 값을 사용한다.
   originals.forEach((original,i)=>{
    const copy=copies[i],computed=getComputedStyle(original);
    for(const property of Array.from(computed))copy.style.setProperty(property,lightPaint[i].get(property)??computed.getPropertyValue(property),'important');
    // 인쇄 시 페이지가 나뉘며 늘어나는 본문 높이는 브라우저가 다시 계산한다.
    if(original.matches('.exam-paper,.exam-paper-heading,.exam-paper-info,.exam-paper-directions,.exam-paper-questions,.exam-paper-column,.exam-question,.exam-question-heading,.reading-text,.code-block,.code-toolbar,pre,fieldset,.exam-option,.exam-memo,.exam-feedback,.exam-memo-feedback,.exam-paper-footer,p,ul,ol,li')){
     copy.style.setProperty('height','auto','important');
     copy.style.setProperty('block-size','auto','important');
    }
    if(original instanceof HTMLTextAreaElement){
     (copy as HTMLTextAreaElement).value=original.value;copy.textContent=original.value;
    }
    if(original instanceof HTMLInputElement){
     (copy as HTMLInputElement).checked=original.checked;copy.toggleAttribute('checked',original.checked);
    }
   });
   const sourceWidth=source.getBoundingClientRect().width;
   const printableWidth=(210-24)*96/25.4;
   const scale=printableWidth/sourceWidth;
   paper.style.setProperty('width',`${sourceWidth}px`,'important');
   paper.style.setProperty('height','auto','important');
   paper.style.setProperty('margin','0','important');
   paper.style.setProperty('zoom',String(scale),'important');
   doc.body.append(paper);
   const grid=source.querySelector('.exam-paper-questions');
   const dividerDisplay=grid?getComputedStyle(grid,'::before').display:'none';
   const style=doc.createElement('style');style.textContent=`
    @page{size:A4;margin:12mm}
    html,body{margin:0!important;padding:0!important;width:${printableWidth}px!important;min-width:0!important;background:#fff!important;color:#272a30!important;color-scheme:light!important}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;animation:none!important;transition:none!important}
    .exam-paper-questions::before{display:${dividerDisplay}!important}
   `;doc.head.append(style);
   // 입력값과 함께 현재 보고 있는 메모·코드의 스크롤 위치도 유지한다.
   originals.forEach((original,i)=>{copies[i].scrollTop=original.scrollTop;copies[i].scrollLeft=original.scrollLeft;});
   paper.getBoundingClientRect();
   // 브라우저마다 PDF 파일명을 iframe 또는 상위 문서 제목에서 가져온다.
   previousTitle=document.title;document.title=printTitle;
   win.addEventListener('afterprint',cleanup,{once:true});
   window.addEventListener('afterprint',cleanup,{once:true});
   cleanupTimer=setTimeout(cleanup,120000);
   win.focus();win.print();
  }catch{cleanup();setError(true);}
  finally{setBusy(false);}
 }
 return <span className="exam-print-control"><button type="button" className="button secondary" disabled={busy} onClick={event=>void print(event.currentTarget)}>{busy?(english?'Preparing…':'준비 중…'):(english?'Print / Save PDF':'PDF 출력')}</button>{error&&<span role="alert">{english?'Could not open print preview. Please try again.':'출력 화면을 열지 못했습니다. 다시 시도해주세요.'}</span>}</span>;
}
