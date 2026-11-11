import { GET as localModels } from '@/lib/models-route';
import { proxyPrivate } from '@/lib/local-remote';
export const GET=(request:Request)=>new URL(request.url).searchParams.get('provider')==='chatgpt'?localModels(request):proxyPrivate(request,'models');
