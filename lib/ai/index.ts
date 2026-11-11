import { chatgptPlanAi } from './chatgpt-plan.ts';
export const getAi = () => chatgptPlanAi;
export type { AiModel, AiProvider, AiRequest, AiStatus } from './types.ts';
