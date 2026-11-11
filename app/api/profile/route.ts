import { proxyPrivate } from '@/lib/local-remote';
export const GET=(request:Request)=>proxyPrivate(request,'profile');
export const PUT=(request:Request)=>proxyPrivate(request,'profile');
export const PATCH=(request:Request)=>proxyPrivate(request,'profile');
