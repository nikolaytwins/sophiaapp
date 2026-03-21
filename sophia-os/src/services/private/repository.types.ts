import type {
  FlirtWindowsForecast,
  ForecastPeriodKind,
  PeriodForecast,
  PeriodForecastPoint,
  PrivateChatMessage,
  PrivateOverview,
  PrivateQuickPrompt,
  RelationshipDynamics,
} from '@/entities/private/models';

export interface PrivateModuleRepository {
  getOverview(asOfISO: string): Promise<PrivateOverview>;
  getPeriodForecast(kind: ForecastPeriodKind): Promise<PeriodForecast>;
  getRelationshipDynamics(): Promise<RelationshipDynamics>;
  getFlirtWindows(): Promise<FlirtWindowsForecast>;
  getPrivateChat(): Promise<PrivateChatMessage[]>;
  appendPrivateChat(userText: string): Promise<PrivateChatMessage[]>;
  getQuickPrompts(): Promise<PrivateQuickPrompt[]>;
}

/** Hooks для backend: натал, транзиты, расчётные метрики */
export interface PrivateAstroMetricsSource {
  fetchNatalProfile(): Promise<{ birthISO: string; lat: number; lng: number } | null>;
  fetchTransitSnapshot(asOfISO: string): Promise<Record<string, number>>;
  /** Замена моков сырыми рядами для графиков */
  fetchEnergySeries(fromISO: string, toISO: string): Promise<PeriodForecastPoint[]>;
}
