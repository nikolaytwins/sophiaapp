import { addDays } from '@/features/habits/habitLogic';
import type { BacklogPriority } from '@/features/tasks/backlog.types';
import type { PlannerTaskRow, PlannerUserStatsRow } from '@/features/tasks/planner.types';
import { getSupabase } from '@/lib/supabase';

async function requireUserId(): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const {
    data: { user },
    error,
  } = await sb.auth.getUser();
  if (error) throw error;
  if (!user?.id) throw new Error('Войди в облако, чтобы работать с задачами');
  return user.id;
}

/** Локальная дата YYYY-MM-DD минус `days` календарных дней. */
function dateKeyMinusDays(dayDate: string, days: number): string {
  return addDays(dayDate, -days);
}

/** Удаляет задачи старше 30 дней по полю day_date (история списка не хранится). */
export async function purgeOldPlannerTasks(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const userId = await requireUserId();
  const cutoff = dateKeyMinusDays(
    (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })(),
    30
  );
  const { error: e1 } = await sb.from('planner_tasks').delete().eq('user_id', userId).lt('day_date', cutoff);
  if (e1) throw e1;
  const { error: e2 } = await sb.from('planner_day_focus').delete().eq('user_id', userId).lt('day_date', cutoff);
  if (e2) throw e2;
}

/** Снимает фокус со всех задач дня, кроме `exceptTaskId` (если передан). */
async function clearPlannerFocusExcept(
  userId: string,
  dayDate: string,
  exceptTaskId?: string
): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  let q = sb
    .from('planner_tasks')
    .update({ is_focus: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('day_date', dayDate)
    .eq('is_focus', true);
  if (exceptTaskId) q = q.neq('id', exceptTaskId);
  const { error } = await q;
  if (error) throw error;
}

export async function listPlannerTasks(dayDate: string): Promise<PlannerTaskRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const userId = await requireUserId();
  const { data, error } = await sb
    .from('planner_tasks')
    .select('id,day_date,title,priority,is_done,is_focus,sort_order,created_at,updated_at')
    .eq('user_id', userId)
    .eq('day_date', dayDate)
    .order('is_done', { ascending: true })
    .order('sort_order', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PlannerTaskRow[];
}

export async function createPlannerTask(input: {
  day_date: string;
  title: string;
  priority: BacklogPriority;
  /** Одна задача с фокусом на день; остальные на этот день сбрасываются. */
  is_focus?: boolean;
}): Promise<PlannerTaskRow> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const userId = await requireUserId();
  const title = input.title.trim();
  if (!title) throw new Error('Введи текст задачи');
  if (input.is_focus) await clearPlannerFocusExcept(userId, input.day_date);
  const { data, error } = await sb
    .from('planner_tasks')
    .insert({
      user_id: userId,
      day_date: input.day_date,
      title,
      priority: input.priority,
      is_focus: Boolean(input.is_focus),
      sort_order: Date.now() % 1_000_000_000,
      updated_at: new Date().toISOString(),
    })
    .select('id,day_date,title,priority,is_done,is_focus,sort_order,created_at,updated_at')
    .single();
  if (error) throw error;
  return data as PlannerTaskRow;
}

export async function updatePlannerTask(
  id: string,
  patch: {
    title?: string;
    priority?: BacklogPriority;
    is_done?: boolean;
    day_date?: string;
    is_focus?: boolean;
  }
): Promise<PlannerTaskRow> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const userId = await requireUserId();
  const { data: cur, error: e0 } = await sb
    .from('planner_tasks')
    .select('day_date,is_focus')
    .eq('id', id)
    .single();
  if (e0) throw e0;
  const finalDay = patch.day_date !== undefined ? patch.day_date : cur.day_date;
  const willRemainOrBecomeFocus =
    patch.is_focus === true || (patch.is_focus === undefined && Boolean(cur.is_focus));
  if (willRemainOrBecomeFocus) {
    await clearPlannerFocusExcept(userId, finalDay, id);
  }
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title.trim();
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.is_done !== undefined) row.is_done = patch.is_done;
  if (patch.day_date !== undefined) row.day_date = patch.day_date;
  if (patch.is_focus !== undefined) row.is_focus = patch.is_focus;
  const { data, error } = await sb
    .from('planner_tasks')
    .update(row)
    .eq('id', id)
    .select('id,day_date,title,priority,is_done,is_focus,sort_order,created_at,updated_at')
    .single();
  if (error) throw error;
  return data as PlannerTaskRow;
}

export async function deletePlannerTask(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  await requireUserId();
  const { error } = await sb.from('planner_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function getPlannerUserStats(): Promise<PlannerUserStatsRow> {
  const sb = getSupabase();
  if (!sb) return { completed_count: 0, updated_at: new Date().toISOString() };
  const userId = await requireUserId();
  const { data, error } = await sb
    .from('planner_user_stats')
    .select('completed_count,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { completed_count: 0, updated_at: new Date().toISOString() };
  return data as PlannerUserStatsRow;
}

export async function adjustPlannerCompletedCount(delta: number): Promise<number> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const userId = await requireUserId();
  const { data: cur, error: e1 } = await sb
    .from('planner_user_stats')
    .select('completed_count')
    .eq('user_id', userId)
    .maybeSingle();
  if (e1) throw e1;
  const base = typeof cur?.completed_count === 'number' ? Number(cur.completed_count) : 0;
  const next = Math.max(0, base + delta);
  const { error: e2 } = await sb.from('planner_user_stats').upsert(
    {
      user_id: userId,
      completed_count: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (e2) throw e2;
  return next;
}
