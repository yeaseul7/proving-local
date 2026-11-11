'use client';
import { useCallback, useState } from 'react';
import { StudyChat } from './study-chat';
import { StudyMarkdown } from './study-markdown';
import { NoteDownload } from './note-download';
import type { StoredStudyNote } from '@/lib/study-sync-client';
import { markdown } from '@/lib/study';
import { syncUrl } from '@/lib/local-config.mjs';
export function LocalWorkspace(){
 const [records,setRecords]=useState<StoredStudyNote[]>([]);
 const [error,setError]=useState('');
 const onAccount=useCallback(()=>{},[]);
 const loaded=useCallback((notes:StoredStudyNote[])=>{setRecords(notes);setError('');},[]);
 const recorded=useCallback((note:StoredStudyNote)=>setRecords(previous=>[note,...previous.filter(item=>item.id!==note.id)]),[]);
 return <div className="app-shell local-app"><aside className="sidebar" style={{padding:24}}><a className="brand" href="/">proving local</a><p>ChatGPT 플랜으로 공부하기</p><a href={`${syncUrl}/settings`} target="_blank" rel="noreferrer">계정·기기 관리</a><p>처음 실행했다면 사이트에서 연결 코드를 받아 터미널에서 연결하세요.</p><code>npm run link -- 연결코드</code><div id="sidebar-account"/></aside><main className="main-content local-main" style={{flex:1,minWidth:0,padding:24}}>{error&&<p role="alert">{error}</p>}<div className="study-container local-study-panel"><StudyChat onRecord={recorded} onRecordsLoaded={loaded} onAccount={onAccount} onWorkspaceError={setError}/></div><section className="local-records" aria-label="공부 기록"><h2>공부 기록</h2>{records.map(note=><article key={note.id}><h3>{note.title}</h3><NoteDownload note={note} english={false} onMarkdown={()=>{const url=URL.createObjectURL(new Blob([markdown(note)],{type:"text/markdown;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download=`${note.title.replace(/[\\/:*?"<>|]/g,"_")}.md`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}/><StudyMarkdown>{note.content}</StudyMarkdown></article>)}</section></main></div>;
}
