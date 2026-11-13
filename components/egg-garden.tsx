'use client';
import { useLanguage } from '@/components/language-provider';
import { dateKey, type StudyNote } from '@/lib/study';

// 작은 달력 칸에서도 실루엣으로 단계를 구분하는 공통 SVG 캐릭터.
const outline={stroke:'#493d34',strokeWidth:1.15,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
function RawEgg(){
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 4C10.7 4 6.5 15.2 6.5 21a9.5 8.2 0 0 0 19 0C25.5 15.2 21.3 4 16 4Z" fill="#fffdf6" {...outline}/><path d="M9.5 16.5c.5-2.5 1.5-5.1 2.8-6.8" stroke="#e6dccc" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function Chick(){
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="m14.8 5.8-.7-2.2m2 2.1 1.1-1.9" {...outline}/>
    <path d="M9.3 15.4C6.2 15.5 4.7 18 5.8 20.3l3.4-.7m13.5-4.2c3.1.1 4.6 2.6 3.5 4.9l-3.4-.7" fill="#ffe17a" {...outline}/>
    <path d="M16 5.6c-5.7 0-9 4.3-9 10.4v6c0 4.1 3.7 6.2 9 6.2s9-2.1 9-6.2v-6C25 9.9 21.7 5.6 16 5.6Z" fill="#ffe17a" {...outline}/>
    <path d="m11.9 28.1-1 1.7m9.2-1.7 1 1.7" {...outline}/>
    <circle cx="12.2" cy="12.5" r="1" fill="#493d34"/><circle cx="19.8" cy="12.5" r="1" fill="#493d34"/>
    <ellipse cx="9.9" cy="15.5" rx="1.8" ry="1.1" fill="#f3ab79"/><ellipse cx="22.1" cy="15.5" rx="1.8" ry="1.1" fill="#f3ab79"/>
    <path d="M13.4 15.5 16 14l2.6 1.5-2.6 2Z" fill="#eea341" {...outline}/>
  </svg>;
}
function Chicken(){
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M16.1 6c-1.5-2.3-.5-4.4 1.2-3.3.7-2.6 3.1-1.6 3.1.4 2.3-1 3.4 1.2 1.5 3.8" fill="#ef7859" {...outline}/>
    <path d="M9.1 18c-3.1.8-4.8 3.3-3.8 5.5l4-1.5m14-3.6 3.4 2.7-3.4 2.1" fill="#fffdf6" {...outline}/>
    <path d="M16.3 5.2c-5.3 0-8.2 3.6-7.5 8.7l.8 4.4c-4.4 6.7-.9 10.3 6.6 10.3 7.8 0 11-4.1 6.1-10.6l.4-4.4c.6-5-1.9-8.4-6.4-8.4Z" fill="#fffdf6" {...outline}/>
    <path d="m12.2 28.7-.6 2m8.3-2 .6 2" {...outline}/>
    <circle cx="12.8" cy="11.8" r=".95" fill="#493d34"/><circle cx="19.7" cy="11.8" r=".95" fill="#493d34"/>
    <ellipse cx="10.8" cy="14.7" rx="1.6" ry="1" fill="#f3ab96"/><ellipse cx="21.9" cy="14.7" rx="1.6" ry="1" fill="#f3ab96"/>
    <path d="M14.6 16c-1.5 3.9 3.9 4.6 3.2 0" fill="#ef7859" {...outline}/>
    <path d="m13.6 14.7 2.6-1.1 2.6 1.1-2.6 2Z" fill="#efb449" {...outline}/>
  </svg>;
}
// 하루 기록 1개: 달걀, 2개: 병아리, 3개 이상: 닭.
function EggForCount({count}:{count:number}){
  return count===1?<RawEgg/>:count===2?<Chick/>:<Chicken/>;
}
const legendLevels=[
  {count:1,ko:'적게',en:'Few',koHint:'달걀 · 하루 1개',enHint:'Egg · 1 note a day'},
  {count:2,ko:'보통',en:'Some',koHint:'병아리 · 하루 2개',enHint:'Chick · 2 notes a day'},
  {count:3,ko:'많이',en:'Many',koHint:'닭 · 하루 3개 이상',enHint:'Chicken · 3+ notes a day'},
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
