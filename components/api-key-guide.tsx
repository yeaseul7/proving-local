'use client';
import {useId,useRef,useState} from 'react';
import Image from 'next/image';
import createKey from '@/public/guides/api-key/create-key.webp';
import configureKey from '@/public/guides/api-key/configure-key.webp';
import copyKey from '@/public/guides/api-key/copy-key.webp';
import styles from './api-key-guide.module.css';
const steps=[
 {title:'새 키 만들기',image:createKey,alt:'API keys 화면 오른쪽 위의 Create new secret key 버튼',description:<>위의 발급 링크에서 OpenAI에 로그인한 뒤, 오른쪽 위 <code>Create new secret key</code>를 누르세요.</>},
 {title:'이름과 프로젝트 확인하기',image:configureKey,alt:'키 생성 창의 이름, 프로젝트, 만료일, 권한과 Create secret key 버튼',description:<><code>Owned by</code>는 본인 계정인 <code>You</code>를 선택하고, 이름은 <code>proving</code>처럼 알아보기 쉽게 적으세요. 사용할 프로젝트와 만료일·권한을 확인한 뒤 <code>Create secret key</code>를 누르세요.</>},
 {title:'키 복사해서 연결하기',image:copyKey,alt:'실제 키 값이 마스킹된 Save your key 창의 Copy 버튼',description:<><code>Copy</code>로 새 키를 복사하고, 이 화면 아래의 API 키 입력칸에 붙여넣은 뒤 <strong>키 연결</strong>을 누르세요. 발급 창을 닫으면 전체 키를 다시 볼 수 없으니 먼저 복사해주세요.</>},
];
export function ApiKeyGuide(){
 const [selected,setSelected]=useState<number|null>(null),dialog=useRef<HTMLDialogElement>(null),titleId=useId();
 return <details className={styles.guide}>
  <summary>사진으로 보는 API 키 발급 방법</summary>
  <div className={styles.content}>
   <ol className={styles.steps}>{steps.map((step,index)=><li key={step.title}>
    <div className={styles.heading}><span aria-hidden="true">{index+1}</span><h3>{step.title}</h3></div>
    <p>{step.description}</p>
    {index===1&&<p className={styles.hint}>모델 목록 조회와 응답 생성 권한이 필요해요. <code>Read only</code>만 선택하면 질문을 보낼 수 없어요.</p>}
    <button type="button" className={styles.imageButton} aria-label={`${index+1}단계 안내 이미지 확대`} onClick={()=>{setSelected(index);dialog.current?.showModal();}}>
     <Image src={step.image} alt={step.alt} sizes="(max-width: 600px) calc(100vw - 90px), 640px" className={styles.image}/>
     <span className={styles.zoomHint}>크게 보기 ↗</span>
    </button>
   </li>)}</ol>
   <p className={styles.note}>화면은 계정에 따라 조금 다를 수 있습니다. 이미지의 키 값은 안내용으로 가렸습니다. <a href="https://developers.openai.com/api/docs/quickstart" target="_blank" rel="noopener noreferrer">OpenAI 공식 가이드 ↗</a></p>
  </div>
  <dialog ref={dialog} className={styles.lightbox} aria-labelledby={titleId} onClose={()=>setSelected(null)} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}>
   <div className={styles.lightboxContent}><header><h3 id={titleId}>{selected!==null?steps[selected].title:'발급 안내'}</h3><button type="button" aria-label="안내 이미지 닫기" onClick={()=>dialog.current?.close()}>닫기 ×</button></header>
    {selected!==null&&<Image src={steps[selected].image} alt={steps[selected].alt} sizes="(max-width: 600px) 95vw, 1100px" className={styles.expandedImage}/>}
   </div>
  </dialog>
 </details>;
}
