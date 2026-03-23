import type { CalendarEvent } from '@/entities/models';

export interface ExternalCalendarSource {
  id: string;
  label: string;
  provider: 'apple' | 'google' | 'web';
}

export interface CalendarReadAdapter {
  listEvents(range: { startISO: string; endISO: string }): Promise<CalendarEvent[]>;
}

export interface CalendarWriteAdapter {
  createEvent(event: Omit<CalendarEvent, 'id' | 'source'>): Promise<CalendarEvent>;
}

export const calendarIntegration = {
  async listExternal(range: { startISO: string; endISO: string }): Promise<CalendarEvent[]> {
    const [{ listDeviceCalendarEvents }, { listIcsCalendarEvents }] = await Promise.all([
      import('./expoCalendarNative'),
      import('./icsCalendar'),
    ]);
    const [device, ics] = await Promise.all([
      listDeviceCalendarEvents(range),
      listIcsCalendarEvents(range),
    ]);
    return [...device, ...ics].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  },
};
