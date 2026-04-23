import { addDays, startOfWeekMondayKey } from '@/features/habits/habitLogic';
import type { PlannerCalendarEventRow, PlannerWeekNotesRow } from '@/features/calendar/calendar.types';
import { getSupabase } from '@/lib/supabase';

async function requireUserId(): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const {
    data: { user },
    error,
  } = await sb.auth.getUser();
  if (error) throw error;
  if (!user?.id) throw new Error('Войди в облако, чтобы работать с календарём');
  return user.id;
}

function normalizeEvent(row: PlannerCalendarEventRow): PlannerCalendarEventRow {
  return {
    ...row,
    event_date: row.event_date ?? null,
    note: row.note ?? null,
  };
}

function dedupeSortEvents(rows: PlannerCalendarEventRow[]): PlannerCalendarEventRow[] {
  const map = new Map<string, PlannerCalendarEventRow>();
  for (const r of rows) map.set(r.id, r);
  return [...map.values()].sort((x, y) => {
    if (x.event_date == null && y.event_date != null) return 1;
    if (x.event_date != null && y.event_date == null) return -1;
    if (x.event_date != null && y.event_date != null) {
      const c = x.event_date.localeCompare(y.event_date);
      if (c !== 0) return c;
    }
    return y.sort_order - x.sort_order;
  });
}

/**
 * События, попадающие в интервал дат сетки: с датой в [startKey, endKey]
 * или без даты, но с week_monday в интервале понедельников недель, пересекающих сетку.
 */
export async function listPlannerCalendarEventsForGrid(
  gridStartKey: string,
  gridEndKey: string
): Promise<PlannerCalendarEventRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const userId = await requireUserId();
  const minWeek = startOfWeekMondayKey(gridStartKey);
  const maxWeek = startOfWeekMondayKey(gridEndKey);

  const [dated, undated] = await Promise.all([
    sb
      .from('planner_calendar_events')
      .select('id,week_monday,event_date,title,note,sort_order,created_at,updated_at')
      .eq('user_id', userId)
      .not('event_date', 'is', null)
      .gte('event_date', gridStartKey)
      .lte('event_date', gridEndKey),
    sb
      .from('planner_calendar_events')
      .select('id,week_monday,event_date,title,note,sort_order,created_at,updated_at')
      .eq('user_id', userId)
      .is('event_date', null)
      .gte('week_monday', minWeek)
      .lte('week_monday', maxWeek),
  ]);
  if (dated.error) throw dated.error;
  if (undated.error) throw undated.error;
  const rows = [
    ...(dated.data ?? []).map((r) => normalizeEvent(r as PlannerCalendarEventRow)),
    ...(undated.data ?? []).map((r) => normalizeEvent(r as PlannerCalendarEventRow)),
  ];
  return dedupeSortEvents(rows);
}

/** События недели: на конкретные дни недели + без даты на эту неделю. */
export async function listPlannerCalendarEventsForWeek(weekMondayKey: string): Promise<PlannerCalendarEventRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const userId = await requireUserId();
  const mon = startOfWeekMondayKey(weekMondayKey);
  const sun = addDays(mon, 6);
  const [dated, undated] = await Promise.all([
    sb
      .from('planner_calendar_events')
      .select('id,week_monday,event_date,title,note,sort_order,created_at,updated_at')
      .eq('user_id', userId)
      .not('event_date', 'is', null)
      .gte('event_date', mon)
      .lte('event_date', sun),
    sb
      .from('planner_calendar_events')
      .select('id,week_monday,event_date,title,note,sort_order,created_at,updated_at')
      .eq('user_id', userId)
      .is('event_date', null)
      .eq('week_monday', mon),
  ]);
  if (dated.error) throw dated.error;
  if (undated.error) throw undated.error;
  const rows = [
    ...(dated.data ?? []).map((r) => normalizeEvent(r as PlannerCalendarEventRow)),
    ...(undated.data ?? []).map((r) => normalizeEvent(r as PlannerCalendarEventRow)),
  ];
  return dedupeSortEvents(rows);
}

export async function createPlannerCalendarEvent(input: {
  week_monday: string;
  event_date: string | null;
  title: string;
  note?: string;
}): Promise<PlannerCalendarEventRow> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const userId = await requireUserId();
  const title = input.title.trim();
  if (!title) throw new Error('Введи название события');
  const weekMonday =
    input.event_date != null && input.event_date !== ''
      ? startOfWeekMondayKey(input.event_date)
      : startOfWeekMondayKey(input.week_monday);
  const eventDate =
    input.event_date != null && input.event_date !== '' ? input.event_date.trim() : null;

  const { data, error } = await sb
    .from('planner_calendar_events')
    .insert({
      user_id: userId,
      week_monday: weekMonday,
      event_date: eventDate,
      title,
      note: input.note?.trim() || null,
      sort_order: Date.now() % 1_000_000_000,
      updated_at: new Date().toISOString(),
    })
    .select('id,week_monday,event_date,title,note,sort_order,created_at,updated_at')
    .single();
  if (error) throw error;
  return normalizeEvent(data as PlannerCalendarEventRow);
}

export async function updatePlannerCalendarEvent(
  id: string,
  patch: { title?: string; note?: string | null; event_date?: string | null; week_monday?: string }
): Promise<PlannerCalendarEventRow> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  await requireUserId();
  const { data: cur, error: e0 } = await sb
    .from('planner_calendar_events')
    .select('event_date,week_monday')
    .eq('id', id)
    .single();
  if (e0) throw e0;
  const curRow = cur as { event_date: string | null; week_monday: string };
  const nextDate =
    patch.event_date !== undefined
      ? patch.event_date === null || patch.event_date === ''
        ? null
        : patch.event_date.trim()
      : curRow.event_date;
  let nextWeekMonday = curRow.week_monday;
  if (nextDate) {
    nextWeekMonday = startOfWeekMondayKey(nextDate);
  } else if (patch.week_monday !== undefined) {
    nextWeekMonday = startOfWeekMondayKey(patch.week_monday);
  }

  const row: Record<string, unknown> = {
    week_monday: nextWeekMonday,
    event_date: nextDate,
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) row.title = patch.title.trim();
  if (patch.note !== undefined) row.note = patch.note === null || patch.note === '' ? null : patch.note.trim();

  const { data, error } = await sb
    .from('planner_calendar_events')
    .update(row)
    .eq('id', id)
    .select('id,week_monday,event_date,title,note,sort_order,created_at,updated_at')
    .single();
  if (error) throw error;
  return normalizeEvent(data as PlannerCalendarEventRow);
}

export async function deletePlannerCalendarEvent(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  await requireUserId();
  const { error } = await sb.from('planner_calendar_events').delete().eq('id', id);
  if (error) throw error;
}

export async function getPlannerWeekNotes(weekMondayKey: string): Promise<PlannerWeekNotesRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const userId = await requireUserId();
  const mon = startOfWeekMondayKey(weekMondayKey);
  const { data, error } = await sb
    .from('planner_week_notes')
    .select('week_monday,body,updated_at')
    .eq('user_id', userId)
    .eq('week_monday', mon)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as PlannerWeekNotesRow;
}

export async function upsertPlannerWeekNotes(weekMondayKey: string, body: string): Promise<PlannerWeekNotesRow> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase не настроен');
  const userId = await requireUserId();
  const mon = startOfWeekMondayKey(weekMondayKey);
  const { data, error } = await sb
    .from('planner_week_notes')
    .upsert(
      {
        user_id: userId,
        week_monday: mon,
        body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_monday' }
    )
    .select('week_monday,body,updated_at')
    .single();
  if (error) throw error;
  return data as PlannerWeekNotesRow;
}
