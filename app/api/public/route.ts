import { proxyPublic } from '@/lib/local-remote';
export const GET=(request:Request)=>proxyPublic(request);
