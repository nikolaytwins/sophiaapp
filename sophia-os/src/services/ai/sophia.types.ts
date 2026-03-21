export type SophiaScenario =
  | 'plan_day'
  | 'food_macros'
  | 'astro_daily'
  | 'tarot'
  | 'reflection'
  | 'tasks_help';

export interface SophiaChatRequest {
  sessionId: string;
  message: string;
  scenario?: SophiaScenario;
}

export interface SophiaChatResponse {
  reply: string;
  toolCalls?: { name: string; args: Record<string, unknown> }[];
}

export interface FoodMacrosRequest {
  rawText: string;
}

export interface FoodMacrosResponse {
  proteinG: number;
  calories: number;
  carbsG: number;
  fatG: number;
  confidence: number;
}
