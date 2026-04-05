import { getSupabase } from '@/lib/supabase';

import { createSupabaseHabitsRepository } from './habits-supabase.repository';
import { localHabitsRepository } from './habits-local.repository';
import type { HabitsRepository } from './types';

const supabaseRepo = createSupabaseHabitsRepository(() => {
  const c = getSupabase();
  if (!c) {
    throw new Error('Supabase не инициализирован');
  }
  return c;
});

async function useCloudHabits(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: { session } } = await sb.auth.getSession();
  return Boolean(session);
}

export const delegatingHabitsRepository: HabitsRepository = {
  async list() {
    if (await useCloudHabits()) return supabaseRepo.list();
    return localHabitsRepository.list();
  },

  async create(input) {
    if (await useCloudHabits()) return supabaseRepo.create(input);
    return localHabitsRepository.create(input);
  },

  async checkIn(id, dateKey) {
    if (await useCloudHabits()) return supabaseRepo.checkIn(id, dateKey);
    return localHabitsRepository.checkIn(id, dateKey);
  },

  async adjustCounter(id, dateKey, delta) {
    if (await useCloudHabits()) return supabaseRepo.adjustCounter(id, dateKey, delta);
    return localHabitsRepository.adjustCounter(id, dateKey, delta);
  },

  async undoWeekly(id, dateKey) {
    if (await useCloudHabits()) return supabaseRepo.undoWeekly(id, dateKey);
    return localHabitsRepository.undoWeekly(id, dateKey);
  },

  async remove(id) {
    if (await useCloudHabits()) return supabaseRepo.remove(id);
    return localHabitsRepository.remove(id);
  },

  async setRequired(id, required) {
    if (await useCloudHabits()) return supabaseRepo.setRequired(id, required);
    return localHabitsRepository.setRequired(id, required);
  },

  async exportAnalytics() {
    if (await useCloudHabits()) return supabaseRepo.exportAnalytics();
    return localHabitsRepository.exportAnalytics();
  },
};
