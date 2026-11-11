import { proxyPublic } from '@/lib/local-remote';
async function handle(request:Request,{params}:{params:Promise<{resource:string[]}>}){return proxyPublic(request,(await params).resource);}
export const GET=handle;
export const POST=handle;
