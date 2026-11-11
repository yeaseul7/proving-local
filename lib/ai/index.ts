import { noAi } from './none.ts';
// API-key requests are delegated to the connected site's existing handlers.
// plan: requests use the local chatgptPlanAi from the shared chat handler.
export const getAi=()=>noAi;
export type { AiModel, AiProvider, AiRequest, AiStatus } from './types.ts';
