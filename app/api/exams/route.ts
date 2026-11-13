import { proxyPrivate } from '@/lib/local-remote';
export const GET=(request:Request)=>proxyPrivate(request,'exams');
export const POST=(request:Request)=>proxyPrivate(request,'exams');
