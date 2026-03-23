import type { ForecastPeriodKind } from '@/entities/private/models';
import type { PrivateModuleRepository } from './repository.types';
import { astroApiBaseUrl } from '@/config/env';
import {
  appendLocalPrivateChat,
  afterDarkQuickPrompts,
  getLocalPrivateChatMessages,
} from './private-chat-local';

async function getJson<T>(path: string): Promise<T> {
  const base = astroApiBaseUrl;
  if (!base) {
    throw new Error(
      'Не задан EXPO_PUBLIC_ASTRO_API_URL. Для localhost: запусти astro_api_server (:8765), в app.config.js в dev уже есть http://127.0.0.1:8765',
    );
  }
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Astro API ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Только реальные расчёты с astro_api_server (PyEphem + private_compute).
 * Моков нет — при падении API запрос падает (TanStack Query покажет ошибку).
 * Чат: локальная очередь без LLM; промпты — статический список кнопок.
 */
export const remotePrivateRepository: PrivateModuleRepository = {
  getOverview(asOfISO) {
    const date = asOfISO.slice(0, 10);
    const q = new URLSearchParams({ date, asOf: asOfISO });
    return getJson(`/v1/overview?${q.toString()}`);
  },

  getPeriodForecast(kind: ForecastPeriodKind) {
    const date = new Date().toISOString().slice(0, 10);
    const q = new URLSearchParams({ kind, date });
    return getJson(`/v1/period?${q.toString()}`);
  },

  getRelationshipDynamics() {
    const date = new Date().toISOString().slice(0, 10);
    const q = new URLSearchParams({ date });
    return getJson(`/v1/relationships?${q.toString()}`);
  },

  getFlirtWindows() {
    const date = new Date().toISOString().slice(0, 10);
    const q = new URLSearchParams({ date });
    return getJson(`/v1/flirt?${q.toString()}`);
  },

  async getPrivateChat() {
    return getLocalPrivateChatMessages();
  },

  async appendPrivateChat(text: string) {
    return appendLocalPrivateChat(text);
  },

  async getQuickPrompts() {
    return afterDarkQuickPrompts;
  },
};
