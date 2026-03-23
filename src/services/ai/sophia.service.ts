import type { FoodMacrosRequest, FoodMacrosResponse, SophiaChatRequest, SophiaChatResponse } from './sophia.types';

export type SophiaProvider = {
  chat(req: SophiaChatRequest): Promise<SophiaChatResponse>;
  foodToMacros(req: FoodMacrosRequest): Promise<FoodMacrosResponse>;
};

const mockProvider: SophiaProvider = {
  async chat(req) {
    return {
      reply: `Mock Sophia: получила «${req.message.slice(0, 80)}${req.message.length > 80 ? '…' : ''}». Подключи remote provider.`,
    };
  },
  async foodToMacros(req) {
    return {
      proteinG: 32,
      calories: 420,
      carbsG: 38,
      fatG: 14,
      confidence: 0.72,
    };
  },
};

let provider: SophiaProvider = mockProvider;

export const sophiaService = {
  setProvider(p: SophiaProvider) {
    provider = p;
  },
  getProvider() {
    return provider;
  },
  chat: (req: SophiaChatRequest) => provider.chat(req),
  foodToMacros: (req: FoodMacrosRequest) => provider.foodToMacros(req),
};
