import { createHash } from 'node:crypto';
import type { StudySession } from './session-store.ts';
export type IdentityProvider = 'chatgpt';
export const accountKeyFor = (issuer:string, subject:string) => createHash('sha256').update(`${issuer}:${subject}`).digest('hex');
export function studyAccountFromSession(session:Pick<StudySession,'account'|'subject'>|null) { return session?.subject.trim() && /^[a-f0-9]{64}$/.test(session.account) && session.account===accountKeyFor('https://auth.openai.com',session.subject) ? session.account : null; }
