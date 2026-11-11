type RuntimeMode={auth:'siwc'|'supabase';ai:'chatgpt-plan'|'openai-key'|'none';store:'remote'|'db'};
export const runtimeMode=():RuntimeMode=>({auth:'supabase',ai:'openai-key',store:'remote'});
export const chatgptPlanAvailable=()=>true;
