import 'server-only';
import { NextResponse } from 'next/server';
import { rm } from 'node:fs/promises';
import { assertLocal, localOrigin } from '../chat-auth.ts';
import { SiwcError } from '../siwc-errors.ts';
import { StudySyncError } from '../study-sync.ts';
import { remoteJson, deviceCredential, deviceFetch, syncFile } from '../local-remote.ts';
import { siwcAuth } from './siwc.ts';
import type { AuthProvider, Identity } from './types.ts';
export type { AuthProvider, Identity } from './types.ts';
const deviceAuth:AuthProvider={
  provider:'supabase', checkRequest:assertLocal,
  async getIdentity(){
    try { const session=await remoteJson('session');return session.account?{provider:'github',accountKey:session.account,name:session.name||'proving 사용자'}:null; }
    catch(error){if(error instanceof StudySyncError&&error.status===401)return null;throw error;}
  },
  async startLogin(request){assertLocal(request);return NextResponse.redirect(new URL('/connect',localOrigin(request)));},
  async finishLogin(request){return this.startLogin(request);},
  async logout(request){
    assertLocal(request,true);
    try{const {deviceId}=await deviceCredential();await deviceFetch('devices',{method:'DELETE',body:JSON.stringify({id:deviceId})});}catch{}
    await rm(syncFile(),{force:true});
    return siwcAuth.logout(request);
  },
};
export const getAuth=()=>deviceAuth;
export async function requireIdentity(){const identity=await deviceAuth.getIdentity();if(!identity)throw new SiwcError(401,'session_expired');return identity;}
