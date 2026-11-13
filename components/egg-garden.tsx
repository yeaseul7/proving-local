'use client';
import { useLanguage } from '@/components/language-provider';
import { dateKey, type StudyNote } from '@/lib/study';

// 작은 달력 칸에서도 실루엣으로 단계를 구분하는 공통 SVG 캐릭터.
const outline={stroke:'#69513b',strokeWidth:1.3,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
function RawEgg(){
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" data-stage="egg">
    <path d="M16 3.5C11.2 3.5 6.7 14.2 6.7 20.3c0 5.1 3.7 8.2 9.3 8.2s9.3-3.1 9.3-8.2C25.3 14.2 20.8 3.5 16 3.5Z" fill="#fff9e9" {...outline}/>
    <path d="M21.5 12.7c1.1 2.9 1.7 5.8 1.7 7.7 0 4.2-2.7 6.1-7.2 6.1" stroke="#eadbc0" strokeWidth="2.4" strokeLinecap="round"/>
    <path d="M10.2 16.2c.6-2.8 1.8-5.4 3-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>;
}
function ChickFace(){
  return <>
    <circle cx="12.1" cy="12.8" r="1.15" fill="#59432e"/><circle cx="19.9" cy="12.8" r="1.15" fill="#59432e"/>
    <ellipse cx="9.5" cy="15.1" rx="1.8" ry="1.1" fill="#f3b28b"/><ellipse cx="22.5" cy="15.1" rx="1.8" ry="1.1" fill="#f3b28b"/>
    <path d="m13.8 15 2.2-1.1 2.2 1.1-2.2 1.8Z" fill="#eda04b" stroke="#b57a3b" strokeWidth=".7" strokeLinejoin="round"/>
  </>;
}
function HatchingChick(){
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" data-stage="hatching">
    <path d="M15.2 6.5c-2-1-2.2-2.5-1.4-3.4m2.3 3.3c-.1-1.7.6-2.6 1.6-3" {...outline}/>
    <path d="M7.1 17c-2.4-.8-4.1.4-3.8 2.1.2 1.1 1.4 1.9 3.9 2.2m17.7-4.9c2.2-1 3.9.2 3.8 1.9-.1 1.1-1.3 2.1-3.8 2.6" fill="#ffe180" {...outline}/>
    <path d="M6.8 24.5v-8.8c0-6.2 3.5-9.8 9.2-9.8s9.2 3.6 9.2 9.8v8.8Z" fill="#ffe180" {...outline}/>
    <ChickFace/>
    <path d="m5.6 18.7 4.1 2.2 3-3.3 3.3 3.5 3.4-3.5 2.9 3.3 4.1-2.2c.1 6.4-3.8 10-10.4 10s-10.5-3.6-10.4-10Z" fill="#fff9e9" {...outline}/>
    <path d="M9 23.2c.9 1.8 2.7 2.8 5.2 3.1" stroke="#eadbc0" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>;
}
function Chick(){
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" data-stage="chick">
    <path d="m12.5 27.1-1.2 2.4m0 0-1.6-.1m1.6.1 1.2.4m6.9-2.8 1.3 2.4m0 0 1.6-.1m-1.6.1-1.2.4" stroke="#c58b48" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M15.2 6.2c-2-1-2.2-2.5-1.4-3.4m2.3 3.3c-.1-1.7.6-2.6 1.6-3" {...outline}/>
    <path d="M7.5 16.7c-2.9-.3-4.5 1.5-3.4 3.2.6 1 1.8 1.5 3.5 1.5m16.9-4.7c2.9-.3 4.5 1.5 3.4 3.2-.6 1-1.8 1.5-3.5 1.5" fill="#ffda6b" {...outline}/>
    <path d="M16 5.6c-5.8 0-9.5 4.2-9.5 10.2v3.6c0 5.6 3.5 8.6 9.5 8.6s9.5-3 9.5-8.6v-3.6c0-6-3.7-10.2-9.5-10.2Z" fill="#ffe180" {...outline}/>
    <ellipse cx="16" cy="22.1" rx="5.5" ry="3.3" fill="#ffedb1"/>
    <ChickFace/>
  </svg>;
}
// 하루 기록 1개: 달걀, 2개: 반쯤 부화한 병아리, 3개 이상: 병아리.
function EggForCount({count}:{count:number}){
  return count===1?<RawEgg/>:count===2?<HatchingChick/>:<Chick/>;
}
const legendLevels=[
  {count:1,ko:'적게',en:'Few',koHint:'달걀 · 하루 1개',enHint:'Egg · 1 note a day'},
  {count:2,ko:'보통',en:'Some',koHint:'반쯤 부화한 병아리 · 하루 2개',enHint:'Hatching chick · 2 notes a day'},
  {count:3,ko:'많이',en:'Many',koHint:'병아리 · 하루 3개 이상',enHint:'Chick · 3+ notes a day'},
];
// onSelect가 없으면 공개 프로필용 읽기 전용 그래프로 그린다.
export function EggGarden({notes=[],counts:dayCounts,today,selected=null,onSelect}:{notes?:StudyNote[];counts?:Record<string,number>;today:string;selected?:string|null;onSelect?:(day:string|null)=>void}){
  const {language}=useLanguage();
  const en=language==='en';
  if(!today)return <div className="egg-loading">{en?'Loading study history…':'공부 기록을 불러오는 중'}</div>;
  const end=new Date(`${today}T12:00:00`);
  const first=new Date(end);first.setFullYear(first.getFullYear()-1);first.setDate(first.getDate()+1);
  const start=new Date(first);start.setDate(start.getDate()-start.getDay());
  const cells:{date:string;count:number;future:boolean;outside:boolean}[]=[];
  const counts=new Map<string,number>(dayCounts?Object.entries(dayCounts):[]);if(!dayCounts)for(const note of notes)counts.set(note.date,(counts.get(note.date)??0)+1);
  const cursor=new Date(start);
  do{const date=dateKey(cursor);cells.push({date,count:counts.get(date)??0,future:date>today,outside:cursor<first});cursor.setDate(cursor.getDate()+1);}while(cursor<=end||cursor.getDay()!==0);
  const weeks=cells.length/7;
  const labels=Array.from({length:weeks},(_,i)=>{const day=new Date(`${cells[i*7].date}T12:00:00`);return i===0||day.getDate()<=7?(en?day.toLocaleDateString('en-US',{month:'short'}):String(day.getMonth()+1)):'';});
  return <section className="egg-garden" aria-label={en?'Study history for the past year':'최근 1년 공부 기록'}>
    
    <div className="egg-chart"><div className="egg-month-axis"><div className="egg-months" style={{gridTemplateColumns:`repeat(${weeks},minmax(0,1fr))`}}>{labels.map((label,i)=><span key={i}>{label}</span>)}</div>{!en&&<span className="egg-month-unit">월</span>}</div><div className="egg-body"><div className="egg-weekdays" aria-hidden="true">{['',en?'Mon':'월','',en?'Wed':'수','',en?'Fri':'금',''].map((label,i)=><span key={i}>{label}</span>)}</div><div className="egg-grid" style={{gridTemplateColumns:`repeat(${weeks},minmax(0,1fr))`,aspectRatio:`${weeks} / 7`}}>{cells.map(cell=>{const label=en?`${cell.date} · ${cell.count} study notes`:`${cell.date} · 공부 기록 ${cell.count}개`;return cell.future||cell.outside?<span className="egg-cell outside" key={cell.date}/>:!onSelect?<span key={cell.date} role="img" className={`egg-cell ${cell.count?'cooked':'uncooked'}`} title={label} aria-label={label}>{cell.count?<EggForCount count={cell.count}/>:<span/>}</span>:<button key={cell.date} className={`egg-cell ${cell.count?'cooked':'uncooked'} ${selected===cell.date?'selected':''}`} title={label} aria-label={label} aria-pressed={selected===cell.date} onClick={()=>onSelect(selected===cell.date?null:cell.date)}>{cell.count?<EggForCount count={cell.count}/>:<span/>}</button>})}</div></div></div>
    <div className="egg-legend"><div>{legendLevels.map(({count,ko,en:enLabel,koHint,enHint})=><span className="legend-item" key={count} title={en?enHint:koHint}><span className="legend-egg"><EggForCount count={count}/></span>{en?enLabel:ko}</span>)}</div></div>
  </section>;
}
