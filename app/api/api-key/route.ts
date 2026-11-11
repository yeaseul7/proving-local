import { proxyPrivate } from '@/lib/local-remote';
export const GET=(request:Request)=>proxyPrivate(request,'api-key');
export const PUT=(request:Request)=>proxyPrivate(request,'api-key');
export const DELETE=(request:Request)=>proxyPrivate(request,'api-key');
