import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPublicSummary } from '@/lib/public-summary';
import { summaryId } from '@/lib/summary-path';
import { introDescription } from '@/lib/profile';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
  const id=summaryId((await params).id);
  const record=id?await getPublicSummary(id):null;
  if(!record)return new Response('Not found',{status:404});
  const font=await readFile(path.join(process.cwd(),'app/fonts/nanum-gothic.ttf'));
  return new ImageResponse(<div style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',background:'#141414',color:'#f2f2f2',padding:'64px 76px',fontFamily:'Nanum',justifyContent:'space-between'}}>
    <div style={{display:'flex',fontSize:30,color:'#8faee4'}}>proving · 공부 기록</div>
    <div style={{display:'flex',flexDirection:'column',gap:28}}>
      <div style={{display:'flex',fontSize:56,lineHeight:1.3,wordBreak:'break-word'}}>{record.title.slice(0,85)}</div>
      <div style={{display:'flex',fontSize:25,lineHeight:1.5,color:'#b9b9b9'}}>{introDescription(record.content,110)}</div>
    </div>
    <div style={{display:'flex',fontSize:24,color:'#b9b9b9'}}>{[record.author.name,record.date].filter(Boolean).join(' · ')}</div>
  </div>,{width:1200,height:630,fonts:[{name:'Nanum',data:font,weight:400,style:'normal'}],headers:{'Cache-Control':'no-store'}});
}
