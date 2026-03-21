/**
 * Future: Apple HealthKit (steps, sleep, nutrition).
 */
export interface HealthReadAdapter {
  getSteps(date: string): Promise<number>;
  getSleepHours(date: string): Promise<number | null>;
}

export const healthIntegration = {
  async getSteps(_date: string): Promise<number> {
    return 0;
  },
};
