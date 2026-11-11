import { proxyPrivate } from '@/lib/local-remote';
export const GET=(request:Request)=>proxyPrivate(request,'devices');
export const POST=(request:Request)=>proxyPrivate(request,'devices');
export const DELETE=(request:Request)=>proxyPrivate(request,'devices');
