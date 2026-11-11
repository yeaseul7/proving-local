import { siwcAuth } from './siwc.ts';
import { SiwcError } from '../siwc-errors.ts';
export const getAuth = () => siwcAuth;
export async function requireIdentity() { const identity = await siwcAuth.getIdentity(); if (!identity) throw new SiwcError(401, 'session_expired'); return identity; }
