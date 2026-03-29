import type { HabitsAnalyticsExport } from '@/services/repositories/types';

/** Текст для вставки в GPT: привычки, даты, hero-скор по дням. */
export function formatHabitsAnalyticsForGpt(data: HabitsAnalyticsExport): string {
  const lines: string[] = [];
  lines.push('# Sophia OS — выгрузка привычек');
  lines.push(`Экспорт: ${data.exportedAt}`);
  lines.push('');
  lines.push('## Привычки и отметки по дням');
  for (const h of data.habits) {
    const dates = [...h.completionDates].sort().join(', ');
    lines.push(
      `- **${h.name}** (${h.cadence}${h.weeklyTarget != null ? `, цель/нед ${h.weeklyTarget}` : ''}): ${dates || 'нет отметок'}`
    );
  }
  lines.push('');
  lines.push('## Hero (ключевые привычки), баллы по дням');
  const heroDays = Object.keys(data.heroHistory).sort();
  for (const d of heroDays) {
    const v = data.heroHistory[d];
    lines.push(`- ${d}: ${v.done} / ${v.total}`);
  }
  lines.push('');
  lines.push('## JSON (для точного разбора)');
  lines.push('```json');
  lines.push(JSON.stringify(data, null, 2));
  lines.push('```');
  return lines.join('\n');
}
