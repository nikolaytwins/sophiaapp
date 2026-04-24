/**
 * Парсинг CSV выписок операций Т‑Банка (разделитель `;`, поля в кавычках).
 * Берём только расходы: статус OK и отрицательная сумма платежа. Поступления и FAILED пропускаем.
 */

export type TbankCsvParsedExpense = {
  /** Стабильный ключ для списка в UI до импорта. */
  key: string;
  dateISO: string;
  /** Положительная сумма расхода в ₽. */
  amountRub: number;
  description: string;
};

export type TbankCsvParseStats = {
  totalLines: number;
  /** Строки данных после заголовка. */
  dataLines: number;
  skippedFailed: number;
  skippedNotOk: number;
  skippedNonExpense: number;
  skippedParse: number;
};

export type TbankCsvParseResult = {
  ok: boolean;
  rows: TbankCsvParsedExpense[];
  stats: TbankCsvParseStats;
  errors: string[];
};

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** Разбор строки CSV с `;` и кавычками `"..."`. */
export function splitSemicolonCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ';') {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function normHeaderCell(s: string): string {
  return s.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').trim().toLowerCase();
}

function parseRuAmount(s: string): number | null {
  const t = s.replace(/\s/g, '').replace(/"/g, '').replace(',', '.');
  if (t === '' || t === '-') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** `24.04.2026 21:22:12` или `24.04.2026` → ISO. */
export function parseTbankOperationDateTime(s: string): string | null {
  const raw = s.replace(/"/g, '').trim();
  const m = /^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/.exec(raw);
  if (!m) return null;
  const dd = Number(m[1]);
  const mo = Number(m[2]);
  const yyyy = Number(m[3]);
  const hh = m[4] != null ? Number(m[4]) : 12;
  const mm = m[5] != null ? Number(m[5]) : 0;
  const ss = m[6] != null ? Number(m[6]) : 0;
  const d = new Date(yyyy, mo - 1, dd, hh, mm, ss, 0);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mo - 1 || d.getDate() !== dd) return null;
  return d.toISOString();
}

const HEADER_DATE = 'дата операции';
const HEADER_STATUS = 'статус';
const HEADER_SUM_PAY = 'сумма платежа';
const HEADER_DESC = 'описание';

export function parseTbankOperationsCsv(content: string): TbankCsvParseResult {
  const errors: string[] = [];
  const text = stripBom(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter((ln) => ln.trim().length > 0);

  const stats: TbankCsvParseStats = {
    totalLines: lines.length,
    dataLines: 0,
    skippedFailed: 0,
    skippedNotOk: 0,
    skippedNonExpense: 0,
    skippedParse: 0,
  };

  if (lines.length < 2) {
    errors.push('В файле нет данных.');
    return { ok: false, rows: [], stats, errors };
  }

  const headerCells = splitSemicolonCsvLine(lines[0]).map(normHeaderCell);
  const idxDate = headerCells.findIndex((c) => c === HEADER_DATE);
  const idxStatus = headerCells.findIndex((c) => c === HEADER_STATUS);
  const idxSumPay = headerCells.findIndex((c) => c === HEADER_SUM_PAY);
  const idxDesc = headerCells.findIndex((c) => c === HEADER_DESC);

  if (idxDate < 0 || idxStatus < 0 || idxSumPay < 0 || idxDesc < 0) {
    errors.push('Не найдены колонки «Дата операции», «Статус», «Сумма платежа» или «Описание». Ожидается CSV Т‑Банка.');
    return { ok: false, rows: [], stats, errors };
  }

  const rows: TbankCsvParsedExpense[] = [];
  let keySeq = 0;

  for (let li = 1; li < lines.length; li++) {
    const cells = splitSemicolonCsvLine(lines[li]);
    if (cells.length < Math.max(idxDate, idxStatus, idxSumPay, idxDesc) + 1) {
      stats.skippedParse++;
      continue;
    }
    stats.dataLines++;

    const statusRaw = (cells[idxStatus] ?? '').replace(/"/g, '').trim();
    const status = statusRaw.toUpperCase();
    if (status === 'FAILED') {
      stats.skippedFailed++;
      continue;
    }
    if (status !== 'OK') {
      stats.skippedNotOk++;
      continue;
    }

    const sumPay = parseRuAmount(cells[idxSumPay] ?? '');
    if (sumPay == null) {
      stats.skippedParse++;
      continue;
    }
    /** Поступления и нулевые операции не импортируем. */
    if (sumPay >= 0) {
      stats.skippedNonExpense++;
      continue;
    }

    const amountRub = Math.abs(sumPay);
    if (!Number.isFinite(amountRub) || amountRub <= 0) {
      stats.skippedParse++;
      continue;
    }

    const dateISO = parseTbankOperationDateTime(cells[idxDate] ?? '');
    if (!dateISO) {
      stats.skippedParse++;
      continue;
    }

    let description = (cells[idxDesc] ?? '').replace(/"/g, '').trim();
    if (!description) description = 'Без описания';

    keySeq++;
    rows.push({
      key: `csv-${li}-${keySeq}`,
      dateISO,
      amountRub,
      description,
    });
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('Не найдено ни одной операции со статусом OK и расходной суммой платежа.');
  }

  return { ok: rows.length > 0 && errors.length === 0, rows, stats, errors };
}
