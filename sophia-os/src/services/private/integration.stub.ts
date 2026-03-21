import type { PeriodForecastPoint } from '@/entities/private/models';
import type { PrivateAstroMetricsSource } from './repository.types';

/** Заготовка: подставить HTTP-клиент к вашему backend с расчётами по наталу. */
export const privateAstroStub: PrivateAstroMetricsSource = {
  async fetchNatalProfile() {
    return null;
  },
  async fetchTransitSnapshot() {
    return {};
  },
  async fetchEnergySeries() {
    return [];
  },
};
