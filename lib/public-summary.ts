import { publicJson } from './local-remote.ts';
import { validOwnerId, type PublicSummary } from './public-content.ts';
export async function getPublicSummary(id:string):Promise<PublicSummary|null>{if(!validOwnerId(id))return null;return (await publicJson(`summaries/${id}`))?.record??null;}
