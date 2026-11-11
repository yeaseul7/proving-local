type RuntimeMode = {auth:'siwc'|'supabase';ai:'chatgpt-plan'|'openai-key'|'none';store:'remote'|'db'};
export const runtimeMode = ():RuntimeMode => ({auth:'siwc',ai:'chatgpt-plan',store:'remote'});
export const chatgptPlanAvailable = () => false;
