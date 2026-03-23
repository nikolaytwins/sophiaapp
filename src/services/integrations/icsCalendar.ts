/**
 * События из ICS по URL (веб и натив с полным URL).
 * При baseUrl /sophia в app.json по умолчанию /sophia/calendar.ics (файл в public/).
 */
import Constants from 'expo-constants';
import ICAL from 'ical.js';
import { Platform } from 'react-native';

import type { CalendarEvent } from '@/entities/models';
import { inferCategoryFromTitle, inferEventTypeFromTitle } from '@/shared/calendarEventHints';

function resolveIcsUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('webcal://')) {
    return t.replace(/^webcal:\/\//i, 'https://');
  }
  if (typeof window !== 'undefined' && t.startsWith('/')) {
    return `${window.location.origin}${t}`;
  }
  return t;
}

function mapOccurrence(
  uid: string,
  instanceId: string,
  title: string,
  startISO: string,
  endISO: string,
  location?: string
): CalendarEvent {
  return {
    id: `ics_${uid}_${instanceId}`.slice(0, 200),
    title,
    start: startISO,
    end: endISO,
    type: inferEventTypeFromTitle(title),
    category: inferCategoryFromTitle(title),
    location,
    source: 'ics',
  };
}

function pushFromVevent(
  vevent: InstanceType<typeof ICAL.Component>,
  rangeStart: Date,
  rangeEnd: Date,
  out: CalendarEvent[]
): void {
  const status = vevent.getFirstPropertyValue('status');
  if (status === 'CANCELLED') return;

  const ev = new ICAL.Event(vevent);
  const uid = ev.uid || `noid_${Math.random().toString(36).slice(2)}`;
  const title = (ev.summary || '(без названия)').trim();
  const location = ev.location || undefined;

  if (!ev.isRecurring()) {
    const start = ev.startDate.toJSDate();
    const end = ev.endDate.toJSDate();
    if (end < rangeStart || start > rangeEnd) return;
    out.push(
      mapOccurrence(uid, 'single', title, start.toISOString(), end.toISOString(), location)
    );
    return;
  }

  const expand = ev.iterator();
  let count = 0;
  while (count < 5000) {
    count++;
    const next = expand.next();
    if (!next) break;
    const occ = ev.getOccurrenceDetails(next);
    const s = occ.startDate.toJSDate();
    const e = occ.endDate.toJSDate();
    if (e < rangeStart) continue;
    if (s > rangeEnd) break;
    const instanceId = next.toString().replace(/[^a-zA-Z0-9]/g, '_');
    out.push(mapOccurrence(uid, instanceId, title, s.toISOString(), e.toISOString(), location));
  }
}

function defaultWebIcsPath(): string {
  const base =
    (Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '';
  if (base) {
    return `${base.replace(/\/$/, '')}/calendar.ics`;
  }
  return '/calendar.ics';
}

export async function listIcsCalendarEvents(range: {
  startISO: string;
  endISO: string;
}): Promise<CalendarEvent[]> {
  const defaultIcs = Platform.OS === 'web' ? defaultWebIcsPath() : '';
  const rawUrl = process.env.EXPO_PUBLIC_CALENDAR_ICS_URL ?? defaultIcs;
  const url = resolveIcsUrl(rawUrl);
  if (!url) return [];

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[ics-calendar]', res.status, url);
      return [];
    }
    const text = await res.text();
    const jcal = ICAL.parse(text);
    const comp = new ICAL.Component(jcal);
    const rangeStart = new Date(range.startISO);
    const rangeEnd = new Date(range.endISO);
    const out: CalendarEvent[] = [];
    const vevents = comp.getAllSubcomponents('vevent');
    for (const vevent of vevents) {
      pushFromVevent(vevent, rangeStart, rangeEnd, out);
    }
    return out.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  } catch (e) {
    console.warn('[ics-calendar]', e);
    return [];
  }
}
