import { cache } from 'react';
import { publicJson } from './local-remote.ts';
import { HANDLE_PATTERN, type PublicProfile } from './profile.ts';
export const seoulToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
export const getPublicProfile=cache(async(handle:string,page=1,day:string|null=null):Promise<PublicProfile|null>=>{if(!HANDLE_PATTERN.test(handle.toLowerCase()))return null;const query=new URLSearchParams({page:String(page),...(day?{day}:{})});const data=await publicJson(`profiles/${encodeURIComponent(handle)}?${query}`);return data?.profile??null;});
