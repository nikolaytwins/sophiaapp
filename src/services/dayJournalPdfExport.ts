import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import {
  getFieldsBySection,
  journalEntryHasContent,
  journalExportDateRange,
  sliceJournalDocumentByDateRange,
} from '@/features/day/dayJournal.logic';
import type {
  JournalDocument,
  JournalExportPeriod,
  JournalFieldDefinition,
  JournalFieldValue,
} from '@/features/day/dayJournal.types';
import { localDateKey } from '@/features/habits/habitLogic';
import { getMoodMeta } from '@/features/journal/journalMood';
import { getDayJournalDocument } from '@/stores/dayJournal.store';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dateKeyToRuLong(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatFieldBlock(field: JournalFieldDefinition, value: JournalFieldValue | undefined): string {
  const v = value ?? null;
  if (field.type === 'toggle') {
    const on = v === true;
    return `<div class="field"><div class="flabel">${escapeHtml(field.label)}</div><p class="val">${on ? 'Да' : 'Нет'}</p></div>`;
  }
  if (field.type === 'number') {
    if (typeof v === 'number' && Number.isFinite(v)) {
      return `<div class="field"><div class="flabel">${escapeHtml(field.label)}</div><p class="val">${escapeHtml(String(v))}</p></div>`;
    }
    return `<div class="field"><div class="flabel">${escapeHtml(field.label)}</div><p class="val muted">—</p></div>`;
  }
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) {
    return `<div class="field"><div class="flabel">${escapeHtml(field.label)}</div><p class="val muted">—</p></div>`;
  }
  return `<div class="field"><div class="flabel">${escapeHtml(field.label)}</div><div class="val text">${escapeHtml(s).replace(/\n/g, '<br/>')}</div></div>`;
}

function buildDaySection(doc: JournalDocument, dateKey: string): string {
  const entry = doc.entries[dateKey];
  const journalFields = getFieldsBySection(doc.fields, 'journal');
  const healthFields = getFieldsBySection(doc.fields, 'health');
  const mood = entry?.mood;
  const moodMeta = mood ? getMoodMeta(mood) : null;
  const moodHtml = moodMeta
    ? `<p class="mood">${escapeHtml(moodMeta.emoji)} ${escapeHtml(moodMeta.label)}</p>`
    : '';

  const journalHtml = journalFields.map((f) => formatFieldBlock(f, entry?.values[f.id])).join('');
  const healthHtml =
    healthFields.length > 0
      ? `<h3 class="sub">Здоровье</h3>${healthFields.map((f) => formatFieldBlock(f, entry?.values[f.id])).join('')}`
      : '';

  return `
<section class="day">
  <h2 class="day-title">${escapeHtml(dateKeyToRuLong(dateKey))}</h2>
  <p class="day-key">${escapeHtml(dateKey)}</p>
  ${moodHtml}
  ${journalHtml}
  ${healthHtml}
</section>`;
}

export function buildJournalPdfHtml(
  doc: JournalDocument,
  meta: { fromKey: string; toKey: string; periodLabel: string; exportedAt: Date }
): string {
  const dayKeys = Object.keys(doc.entries)
    .filter((k) => k >= meta.fromKey && k <= meta.toKey)
    .sort((a, b) => a.localeCompare(b));
  const withContent = dayKeys.filter((k) => journalEntryHasContent(doc.entries[k], doc.fields));
  const bodyInner =
    withContent.length === 0
      ? `<p class="empty">За выбранный период нет записей с текстом, числами, переключателями или настроением.</p>`
      : withContent.map((k) => buildDaySection(doc, k)).join('\n');

  const exportedStr = meta.exportedAt.toLocaleString('ru-RU');
  const rangeStr =
    meta.fromKey === meta.toKey ? meta.fromKey : `${meta.fromKey} — ${meta.toKey}`;

  const styles = `
    * { box-sizing: border-box; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111;
      font-size: 11pt;
      line-height: 1.5;
      margin: 0;
      padding: 16mm 14mm;
    }
    h1 { font-size: 20pt; margin: 0 0 6px; font-weight: 800; letter-spacing: -0.02em; }
    .meta { color: #555; font-size: 10pt; margin: 0 0 22px; line-height: 1.45; }
    .day { margin: 0 0 22px; padding-bottom: 18px; border-bottom: 1px solid #e2e2e2; page-break-inside: avoid; }
    .day:last-of-type { border-bottom: none; }
    .day-title { font-size: 13pt; margin: 0 0 4px; font-weight: 800; }
    .day-key { font-size: 9pt; color: #888; margin: 0 0 10px; }
    .mood { margin: 0 0 14px; font-size: 11pt; font-weight: 600; }
    h3.sub {
      font-size: 9pt; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
      color: #64748b; margin: 16px 0 10px;
    }
    .field { margin-bottom: 12px; }
    .flabel {
      font-size: 8.5pt; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
      color: #666; margin-bottom: 4px;
    }
    .val { margin: 0; }
    .val.text { white-space: pre-wrap; }
    .val.muted { color: #aaa; }
    .empty { color: #666; font-size: 11pt; margin-top: 8px; }
    @media print {
      body { padding: 12mm; }
      .day { page-break-inside: avoid; }
    }
  `;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(`Дневник — ${meta.periodLabel}`)}</title>
  <style>${styles}</style>
</head>
<body>
  <h1>Sophia OS — дневник</h1>
  <p class="meta">
    Период: <strong>${escapeHtml(meta.periodLabel)}</strong> (${escapeHtml(rangeStr)})<br/>
    Выгружено: ${escapeHtml(exportedStr)}
  </p>
  ${bodyInner}
</body>
</html>`;
}

function printJournalHtmlInWebPopup(html: string): void {
  if (typeof window === 'undefined') return;
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) {
    throw new Error('Браузер заблокировал окно печати. Разреши всплывающие окна для этого сайта.');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 300);
}

/**
 * PDF на iOS/Android (через системный шаринг) или диалог печати / «Сохранить как PDF» в отдельном окне на вебе.
 */
export async function exportDayJournalPdf(period: JournalExportPeriod): Promise<void> {
  const todayKey = localDateKey();
  const { fromKey, toKey, label } = journalExportDateRange(period, todayKey);
  const sliced = sliceJournalDocumentByDateRange(getDayJournalDocument(), fromKey, toKey);
  const html = buildJournalPdfHtml(sliced, {
    fromKey,
    toKey,
    periodLabel: label,
    exportedAt: new Date(),
  });

  if (Platform.OS === 'web') {
    printJournalHtmlInWebPopup(html);
    return;
  }

  const { uri } = await Print.printToFileAsync({
    html,
    margins: { top: 56, right: 48, bottom: 56, left: 48 },
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('На этом устройстве недоступна отправка файлов. Обнови систему или открой приложение на телефоне.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Сохранить дневник (PDF)',
    UTI: 'com.adobe.pdf',
  });
}
