import { t } from '@/intl';
import { parseCsv, sniffSeparator, toCsv } from '@/domain/reportFiles';
import {
  findHeaderRow,
  parseImportNumber,
  type ImportFileFailure,
} from '@/domain/csvImport';
import type {
  ConsumptionEstimatesResult,
  ReplaceConsumptionEstimatesResult,
  ReplaceConsumptionEstimatesVariables,
} from './consumptionEstimates.generated';

/*
 * The store editor's consumption-estimate upload (spec/settings/rules.md § The
 * store editor › Consumption estimates): a spreadsheet of items and the units
 * each consumed per month, for a store with no consumption history of its own.
 *
 * Month columns are headed by the month itself (`2026-10`), never "last month":
 * a file filled in on the 30th and uploaded on the 2nd would otherwise shift
 * every value back a month without anyone noticing.
 */

export type Estimate =
  ConsumptionEstimatesResult['consumptionEstimates']['estimates'][number];

type ConsumptionEstimateLineInput =
  ReplaceConsumptionEstimatesVariables['input']['lines'][number];

type ReplaceResult =
  ReplaceConsumptionEstimatesResult['centralServer']['preferences']['replaceConsumptionEstimates'];

/** A calendar month, `YYYY-MM`. */
export type Month = string;

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');

const monthOf = (date: Date): Month =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/** The month a period starting on its 1st is for, or undefined. */
export const monthOfPeriod = (
  periodStart: string,
  periodEnd: string
): Month | undefined => {
  const month = periodStart.slice(0, 7);
  const period = monthPeriod(month);
  return period?.periodStart === periodStart && period.periodEnd === periodEnd
    ? month
    : undefined;
};

/** A month's first and last day, as the wire's ISO dates. */
export const monthPeriod = (
  month: Month
): { periodStart: string; periodEnd: string } | undefined => {
  const match = MONTH_PATTERN.exec(month.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) return undefined;
  // Day 0 of the next month is this month's last day
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    periodStart: `${year}-${pad(monthNumber)}-01`,
    periodEnd: `${year}-${pad(monthNumber)}-${pad(lastDay)}`,
  };
};

/**
 * The template's months, newest first: the last finished month and the ones
 * before it, as many as the store's AMC look-back counts (at least one).
 */
export const templateMonths = (
  lookBackMonths: number,
  today: Date
): Month[] => {
  const count = Math.max(1, Math.ceil(lookBackMonths));
  return Array.from({ length: count }, (_, index) =>
    monthOf(new Date(today.getFullYear(), today.getMonth() - 1 - index, 1))
  );
};

/** Whether a month has finished: only those can hold an estimate. */
export const isFinishedMonth = (month: Month, today: Date): boolean =>
  month < monthOf(today);

/*
 * The template: code and name, then one column per month, newest first. The
 * store's current estimates are filled in, so an upload is an edit of what's
 * there rather than a blank form; a month they cover that the look-back no
 * longer reaches keeps its column so a download-then-upload changes nothing.
 */
export const buildTemplateCsv = (
  lookBackMonths: number,
  estimates: readonly Estimate[],
  today: Date
): string => {
  const months = new Set(templateMonths(lookBackMonths, today));
  const byItem = new Map<
    string,
    { code: string; name: string; values: Map<Month, number> }
  >();
  for (const estimate of estimates) {
    const month = monthOfPeriod(estimate.periodStart, estimate.periodEnd);
    if (!month) continue;
    months.add(month);
    const item = byItem.get(estimate.itemId) ?? {
      code: estimate.item.code,
      name: estimate.item.name,
      values: new Map(),
    };
    item.values.set(month, estimate.quantity);
    byItem.set(estimate.itemId, item);
  }
  const columns = [...months].sort().reverse();
  const rows = [...byItem.values()]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(item => [
      item.code,
      item.name,
      ...columns.map(month => item.values.get(month) ?? ''),
    ]);
  return toCsv([t('label.code'), t('label.name'), ...columns], rows);
};

export interface EstimateImportRow {
  /** 1-based, counting the heading row as 1 — what the file shows the user. */
  lineNumber: number;
  itemCode: string;
  /** For reading only: the server matches on the code. */
  itemName: string;
  /** month → units, for the months this row fills in. */
  quantities: Record<Month, number>;
  /** month → the cell as written, for the review table. */
  cells: Record<Month, string>;
  /** Rejections — any one keeps the whole file from uploading. */
  errors: string[];
  /** Saved anyway, but the user should know. */
  warnings: string[];
}

export type ParsedEstimateFile =
  | { kind: 'ok'; months: Month[]; rows: EstimateImportRow[] }
  | { kind: 'failed'; reason: ImportFileFailure };

/*
 * Columns: the first is the item CODE and the second its NAME, whatever they
 * are titled; every other column headed by a month (`YYYY-MM`) is that month.
 * Any other column is ignored. A blank month cell is no estimate for that
 * month; a row with every month blank is skipped.
 */
export const parseEstimateFile = (
  text: string,
  today: Date
): ParsedEstimateFile => {
  const separator = sniffSeparator(text);
  const table = parseCsv(text, separator);
  const headerIndex = findHeaderRow(table, [t('label.code'), t('label.name')]);
  if (headerIndex === -1) return { kind: 'failed', reason: 'no-header' };
  const header = table[headerIndex] ?? [];
  const monthColumns = header
    .map((title, index) => ({ month: title.trim(), index }))
    .filter(({ month, index }) => index >= 2 && monthPeriod(month));
  const months = monthColumns.map(({ month }) => month);

  const rows: EstimateImportRow[] = [];
  table.slice(headerIndex + 1).forEach((cells, offset) => {
    const filled = monthColumns.filter(
      ({ index }) => (cells[index] ?? '').trim() !== ''
    );
    const itemCode = (cells[0] ?? '').trim();
    if (!itemCode && filled.length === 0) return;

    const row: EstimateImportRow = {
      lineNumber: headerIndex + offset + 2,
      itemCode,
      itemName: (cells[1] ?? '').trim(),
      quantities: {},
      cells: {},
      errors: [],
      warnings: [],
    };
    if (!itemCode) row.errors.push(t('error.code-required'));
    for (const { month, index } of filled) {
      const raw = (cells[index] ?? '').trim();
      row.cells[month] = raw;
      const quantity = parseImportNumber(raw, separator === ';');
      if (quantity === undefined || quantity < 0) {
        row.errors.push(t('error.consumption-estimate-invalid', { month }));
      } else if (!isFinishedMonth(month, today)) {
        row.errors.push(
          t('error.consumption-estimate-month-not-finished', { month })
        );
      } else {
        row.quantities[month] = quantity;
      }
    }
    rows.push(row);
  });

  if (rows.length === 0) return { kind: 'failed', reason: 'no-rows' };
  return { kind: 'ok', months, rows };
};

/** Where each wire line came from, so the server's answer lands on its row. */
export interface LineOrigin {
  row: EstimateImportRow;
  month: Month;
}

export const buildLines = (
  rows: readonly EstimateImportRow[]
): { lines: ConsumptionEstimateLineInput[]; origins: LineOrigin[] } => {
  const lines: ConsumptionEstimateLineInput[] = [];
  const origins: LineOrigin[] = [];
  for (const row of rows) {
    for (const [month, quantity] of Object.entries(row.quantities)) {
      const period = monthPeriod(month);
      if (!period) continue;
      lines.push({ itemIdOrCode: row.itemCode, ...period, quantity });
      origins.push({ row, month });
    }
  }
  return { lines, origins };
};

/*
 * The server's verdict on a dry run, put onto the rows the lines came from.
 * Rows are copied, never edited in place: the review table keys on them.
 */
export const applyServerResult = (
  rows: readonly EstimateImportRow[],
  origins: readonly LineOrigin[],
  result: ReplaceResult
): EstimateImportRow[] => {
  const added = new Map<
    EstimateImportRow,
    { errors: string[]; warnings: string[] }
  >();
  const note = (row: EstimateImportRow) => {
    const entry = added.get(row) ?? { errors: [], warnings: [] };
    added.set(row, entry);
    return entry;
  };

  if (result.__typename === 'ConsumptionEstimateLinesError') {
    for (const error of result.errors) {
      const origin = origins[error.line];
      if (!origin) continue;
      const { month } = origin;
      const message = (() => {
        switch (error.problem) {
          case 'ITEM_NOT_FOUND':
            return t('error.item-code-not-found', {
              code: origin.row.itemCode,
            });
          case 'OVERLAPS_LINE': {
            const other =
              error.otherLine === null || error.otherLine === undefined
                ? undefined
                : origins[error.otherLine];
            return t('error.consumption-estimate-duplicate', {
              month,
              line: other?.row.lineNumber ?? '',
            });
          }
          case 'PERIOD_IN_FUTURE':
            return t('error.consumption-estimate-month-not-finished', {
              month,
            });
          default:
            return t('error.consumption-estimate-invalid', { month });
        }
      })();
      const entry = note(origin.row);
      // An unknown code fails every month of its row: say it once
      if (!entry.errors.includes(message)) entry.errors.push(message);
    }
  } else {
    for (const overlap of result.overlaps) {
      const origin = origins[overlap.line];
      if (!origin) continue;
      note(origin.row).warnings.push(
        t('messages.consumption-estimate-overlaps-actual', {
          month: origin.month,
          quantity: overlap.actualQuantity,
        })
      );
    }
  }

  return rows.map(row => {
    const extra = added.get(row);
    return extra
      ? {
          ...row,
          errors: [...row.errors, ...extra.errors],
          warnings: [...row.warnings, ...extra.warnings],
        }
      : row;
  });
};

/*
 * The panel's table: one row per item, one column per month, newest first.
 * An estimate that isn't a whole calendar month (none come from the upload) is
 * shown under the month it starts in.
 */
export interface EstimateTableRow {
  itemId: string;
  code: string;
  name: string;
  quantities: Record<Month, number>;
}

export const pivotEstimates = (
  estimates: readonly Estimate[]
): { months: Month[]; rows: EstimateTableRow[] } => {
  const months = new Set<Month>();
  const byItem = new Map<string, EstimateTableRow>();
  for (const estimate of estimates) {
    const month = estimate.periodStart.slice(0, 7);
    months.add(month);
    const row = byItem.get(estimate.itemId) ?? {
      itemId: estimate.itemId,
      code: estimate.item.code,
      name: estimate.item.name,
      quantities: {},
    };
    row.quantities[month] = (row.quantities[month] ?? 0) + estimate.quantity;
    byItem.set(estimate.itemId, row);
  }
  return {
    months: [...months].sort().reverse(),
    rows: [...byItem.values()].sort((a, b) => a.code.localeCompare(b.code)),
  };
};
