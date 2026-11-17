import { getAuth } from '@/lib/auth';

export const GET = (request: Request) => getAuth().startLogin(request);

export const POST = (request: Request) => getAuth().startLogin(request);
