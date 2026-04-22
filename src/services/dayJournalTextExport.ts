import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import { buildJournalPeriodPlainText } from '@/features/day/dayJournal.logic';
import type { JournalDocument } from '@/features/day/dayJournal.types';

function safeTxtFilename(fromKey: string, toKey: string): string {
  return `sophia-journal_${fromKey}_${toKey}.txt`;
}

/** Скачивание UTF-8 .txt в браузере (без всплывающих окон). */
export function tryDownloadJournalTxtOnWeb(filename: string, text: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return false;
  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    return false;
  }
}

export type JournalTxtExportResult = 'web-downloaded' | 'native-shared' | 'clipboard';

/**
 * Выгрузка дневника за период в .txt: веб — скачивание файла (или буфер при ошибке),
 * iOS/Android — системный «Поделиться», при отказе — буфер.
 */
export async function exportJournalPeriodAsTxt(
  doc: JournalDocument,
  fromKey: string,
  toKey: string
): Promise<JournalTxtExportResult> {
  const sortedFrom = fromKey <= toKey ? fromKey : toKey;
  const sortedTo = fromKey <= toKey ? toKey : fromKey;
  const body = buildJournalPeriodPlainText(doc, sortedFrom, sortedTo);
  const name = safeTxtFilename(sortedFrom, sortedTo);

  if (Platform.OS === 'web') {
    if (tryDownloadJournalTxtOnWeb(name, body)) return 'web-downloaded';
    await Clipboard.setStringAsync(body);
    return 'clipboard';
  }

  try {
    await Share.share({ message: body, title: 'Sophia OS — дневник' });
    return 'native-shared';
  } catch {
    await Clipboard.setStringAsync(body);
    return 'clipboard';
  }
}
