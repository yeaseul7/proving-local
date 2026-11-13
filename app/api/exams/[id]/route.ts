import { proxyPrivate } from '@/lib/local-remote';
type Context={params:Promise<{id:string}>};
export const GET=async(request:Request,{params}:Context)=>proxyPrivate(request,`exams/${(await params).id}`);
export const PATCH=async(request:Request,{params}:Context)=>proxyPrivate(request,`exams/${(await params).id}`);
