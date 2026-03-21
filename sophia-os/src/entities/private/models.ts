export type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high';

export type BandLabel = 'low' | 'medium' | 'high';

export interface SensualScore {
  value100: number;
  headline: string;
  interpretation: string;
  asOf: string;
}

export interface PrivateMetric {
  id: string;
  key: string;
  labelRu: string;
  value: number;
  band: BandLabel;
  description: string;
  confidence: ConfidenceLevel;
  /** Для «игровых» индикаторов — не факт */
  speculativeNote?: string;
  isPlayfulEstimate?: boolean;
}

export interface RiskFlag {
  id: string;
  severity: BandLabel;
  title: string;
  detail: string;
}

export interface RelationshipTone {
  summary: string;
  betterForFeelingsTalk: boolean;
  avoidConflict: boolean;
  freedomNeed: BandLabel;
  closenessNeed: BandLabel;
  validationNeed: BandLabel;
  tensionNote: string;
}

export interface SocialWindow {
  id: string;
  label: string;
  windowStart: string;
  windowEnd: string;
  openness: BandLabel;
  charismaHint: string;
  suggestion: string;
  confidence: ConfidenceLevel;
}

export interface TonightGuidance {
  do: string[];
  avoid: string[];
  tone: string;
}

export interface PrivateOverview {
  sensualScore: SensualScore;
  metrics: PrivateMetric[];
  tonight: TonightGuidance;
  risks: RiskFlag[];
  relationshipTone: RelationshipTone;
  socialWindows: SocialWindow[];
}

export type ForecastPeriodKind = 'day' | 'three_days' | 'week' | 'month' | 'season';

export interface PeriodForecastPoint {
  date: string;
  sensualEnergy: number;
  flirtOpenness: number;
  impulseRisk: number;
  relationshipTension: number;
}

export interface PeriodForecast {
  kind: ForecastPeriodKind;
  theme: string;
  narrative: string;
  points: PeriodForecastPoint[];
  highlights: { label: string; from: string; to: string; note: string }[];
}

export interface RelationshipDynamics {
  headline: string;
  forecast: string;
  doList: string[];
  avoidList: string[];
  markers: { date: string; label: string; intensity: BandLabel }[];
}

export interface FlirtWindowsForecast {
  headline: string;
  windows: SocialWindow[];
  timelineNote: string;
  practical: string[];
}

export type PrivateChatRole = 'user' | 'assistant';

export interface PrivateChatMessage {
  id: string;
  role: PrivateChatRole;
  text: string;
  createdAt: string;
}

export interface PrivateQuickPrompt {
  id: string;
  text: string;
}

/** Заготовка под Face ID / PIN / скрытые превью */
export interface PrivatePrivacyPrefs {
  requireBiometric: boolean;
  hideNotificationPreviews: boolean;
}
