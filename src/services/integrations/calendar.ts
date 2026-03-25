import type { CalendarEvent } from '@/entities/models';

/**
 * Future: Apple EventKit / CalDAV / your web calendar.
 */
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
  /** Replace with native module when ready */
  async listExternal(_range: { startISO: string; endISO: string }): Promise<CalendarEvent[]> {
    return [];
  },
};
