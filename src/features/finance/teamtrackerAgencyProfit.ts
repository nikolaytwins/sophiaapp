import { teamtrackerBaseUrl, teamtrackerIntegrationSecret } from '@/config/env';

export type TeamtrackerAgencyProfitMonth = {
  year: number;
  month: number;
  expectedRevenue: number;
  actualRevenue: number;
  totalExpenses: number;
  expectedProfit: number;
  actualProfit: number;
};

/**
 * Выручка агентства за месяц из Teamtracker (`/api/integrations/sophia/agency-profit`).
 */
export async function fetchTeamtrackerAgencyProfitForMonth(
  year: number,
  month: number
): Promise<TeamtrackerAgencyProfitMonth> {
  const base = teamtrackerBaseUrl;
  const secret = teamtrackerIntegrationSecret;
  if (!base || secret.length < 16) {
    throw new Error('Teamtracker: задайте EXPO_PUBLIC_TEAMTRACKER_URL и EXPO_PUBLIC_TEAMTRACKER_INTEGRATION_SECRET (≥16 символов)');
  }
  /** Относительный путь — чтобы работал и корень (`http://host/`), и basePath (`http://host/pm-board`). */
  const root = base.trim().replace(/\/+$/, '');
  const originBase = root.endsWith('/') ? root : `${root}/`;
  const u = new URL('api/integrations/sophia/agency-profit', originBase);
  u.searchParams.set('year', String(year));
  u.searchParams.set('month', String(month));
  const res = await fetch(u.toString(), {
    method: 'GET',
    headers: { 'x-tt-integration-secret': secret },
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Teamtracker: не JSON (${res.status})`);
  }
  if (!res.ok) {
    const msg = typeof data === 'object' && data && 'error' in data ? String((data as { error: unknown }).error) : text;
    throw new Error(msg || `Teamtracker HTTP ${res.status}`);
  }
  const o = data as Record<string, unknown>;
  return {
    year: Number(o.year),
    month: Number(o.month),
    expectedRevenue: Number(o.expectedRevenue) || 0,
    actualRevenue: Number(o.actualRevenue) || 0,
    totalExpenses: Number(o.totalExpenses) || 0,
    expectedProfit: Number(o.expectedProfit) || 0,
    actualProfit: Number(o.actualProfit) || 0,
  };
}
