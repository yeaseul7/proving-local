import { validOwnerId } from './public-content.ts';
const alphabet='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';
// UUID 128비트를 22자로 표현한다. 잘라 쓰지 않아 충돌과 별도 DB 매핑이 없다.
function code(id:string):string {
  if(!validOwnerId(id))throw new Error('Invalid summary id');
  let value=BigInt(`0x${id.replaceAll('-','')}`), result='';
  for(let i=0;i<22;i++){result=alphabet[Number(value%64n)]+result;value/=64n;}
  return result;
}
export function summaryPath(record:{id:string;title:string}):string {
  const slug=record.title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,70).replace(/-$/,'')||'study-note';
  return `/summaries/${encodeURIComponent(slug)}~${code(record.id)}`;
}
export function summaryId(segment:string):string|null {
  if(validOwnerId(segment))return segment.toLowerCase();
  const match=/^.+~([0-3][0-9a-zA-Z_-]{21})$/.exec(segment);
  if(!match)return null;
  let value=0n;for(const character of match[1])value=value*64n+BigInt(alphabet.indexOf(character));
  const hex=value.toString(16).padStart(32,'0');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
// Next의 params는 경로에 따라 인코딩된 문자열일 수 있다.
export function isCanonicalSummary(segment:string,record:{id:string;title:string}):boolean {
  try{return `/summaries/${decodeURIComponent(segment)}`===decodeURIComponent(summaryPath(record));}
  catch{return false;}
}
