import { getSupabase } from '@/lib/supabase';
import { createPlannerTask } from '@/features/tasks/plannerApi';

import type { BacklogPriority, BacklogTask, BacklogTaskType } from '@/features/tasks/backlog.types';

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

export async function listBacklogTypes(): Promise<BacklogTaskType[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const userId = await requireUserId();
  const { data, error } = await sb
    .from('backlog_task_types')
    .select('id,name,created_at')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BacklogTaskType[];
}

export async function createBacklogType(name: string): Promise<BacklogTaskType> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Введи название типа');
  const { data, error } = await sb
    .from('backlog_task_types')
    .insert({ user_id: userId, name: trimmed })
    .select('id,name,created_at')
    .single();
  if (error) throw error;
  return data as BacklogTaskType;
}

export async function listBacklogTasks(): Promise<BacklogTask[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const userId = await requireUserId();
  const { data, error } = await sb
    .from('backlog_tasks')
    .select('id,title,description,type_id,priority,sort_order,created_at,updated_at')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as BacklogTask[];
}

export async function createBacklogTask(input: {
  title: string;
  description?: string | null;
  type_id?: string | null;
  priority: BacklogPriority;
}): Promise<BacklogTask> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const userId = await requireUserId();
  const title = input.title.trim();
  if (!title) throw new Error('Введи заголовок');
  const { data, error } = await sb
    .from('backlog_tasks')
    .insert({
      user_id: userId,
      title,
      description: input.description?.trim() || null,
      type_id: input.type_id ?? null,
      priority: input.priority,
      sort_order: Date.now() % 1_000_000_000,
    })
    .select('id,title,description,type_id,priority,sort_order,created_at,updated_at')
    .single();
  if (error) throw error;
  return data as BacklogTask;
}

export async function updateBacklogTask(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    type_id?: string | null;
    priority?: BacklogPriority;
  }
): Promise<BacklogTask> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  await requireUserId();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title.trim();
  if (patch.description !== undefined) row.description = patch.description?.trim() || null;
  if (patch.type_id !== undefined) row.type_id = patch.type_id;
  if (patch.priority !== undefined) row.priority = patch.priority;
  const { data, error } = await sb.from('backlog_tasks').update(row).eq('id', id).select().single();
  if (error) throw error;
  return data as BacklogTask;
}

export async function deleteBacklogTask(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  await requireUserId();
  const { error } = await sb.from('backlog_tasks').delete().eq('id', id);
  if (error) throw error;
}

/** Создаёт задачу в дневном плане и удаляет из бэклога. */
export async function scheduleBacklogTaskToDay(
  task: Pick<BacklogTask, 'id' | 'title' | 'priority'>,
  dayDate: string
): Promise<void> {
  await createPlannerTask({
    day_date: dayDate,
    title: task.title,
    priority: task.priority,
  });
  await deleteBacklogTask(task.id);
}

/** Пакетный перенос (по очереди, чтобы не ломать sort_order и счётчики). */
export async function scheduleBacklogTasksToDay(
  tasks: Pick<BacklogTask, 'id' | 'title' | 'priority'>[],
  dayDate: string
): Promise<void> {
  for (const t of tasks) {
    await scheduleBacklogTaskToDay(t, dayDate);
  }
}

export function mergeTasksWithTypes(tasks: BacklogTask[], types: BacklogTaskType[]) {
  const map = new Map(types.map((t) => [t.id, t.name]));
  return tasks.map((t) => ({
    ...t,
    typeName: t.type_id ? map.get(t.type_id) ?? null : null,
  }));
}

export function sortBacklogTasksForDisplay<T extends BacklogTask>(tasks: T[]): T[] {
  const rank: Record<BacklogPriority, number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    const pr = rank[a.priority] - rank[b.priority];
    if (pr !== 0) return pr;
    if (b.sort_order !== a.sort_order) return b.sort_order - a.sort_order;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
