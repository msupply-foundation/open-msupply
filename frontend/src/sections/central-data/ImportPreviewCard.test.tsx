import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * The preview card and its footer (spec/central-data/ui-surface.md § preview
 * card). No e2e suite reaches them: the e2e stack isn't a standalone central.
 * Library components are stand-ins that record what renders; the card's own
 * Switch and centralDataLogic are real.
 */

interface AlertProps {
  testId?: string;
  severity: string;
  children: unknown;
}
interface ButtonProps {
  disabled?: boolean;
  'data-testid'?: string;
}

const shown: {
  alerts: AlertProps[];
  changedRows: number;
  errorTables: number;
  buttons: Record<string, ButtonProps>;
} = { alerts: [], changedRows: 0, errorTables: 0, buttons: {} };

// Reads a JSX child the stand-ins returned, so conditional content renders.
const resolve = (value: unknown): unknown =>
  typeof value === 'function'
    ? resolve((value as () => unknown)())
    : Array.isArray(value)
      ? value.map(resolve)
      : value;

// Hoisted with the mocks, which run before the rest of the file.
const { passThrough } = vi.hoisted(() => ({
  passThrough: (p: { children?: unknown }) => p.children,
}));

vi.mock('@/ui/layout/Detail/DetailCard', () => ({ DetailCard: passThrough }));
vi.mock('@/ui/layout/CardGrid/CardGrid', () => ({ CardGrid: () => '' }));
vi.mock('@/ui/layout/Stack/Stack', () => ({ Stack: passThrough }));
vi.mock('@/ui/layout/Stack/HStack', () => ({ HStack: passThrough }));
vi.mock('@/ui/layout/ContentFooter/ContentFooter', () => ({
  ContentFooter: passThrough,
}));
vi.mock('@/ui/layout/ContentFooter/ContentFooterActions', () => ({
  ContentFooterActions: passThrough,
}));
vi.mock('@/ui/elements/typography/Text', () => ({ Text: passThrough }));
vi.mock('@/ui/elements/feedback/StatusBadge', () => ({
  StatusBadge: () => '',
}));
vi.mock('@/ui/elements/buttons/Button', () => ({
  Button: (p: ButtonProps) => {
    if (p['data-testid']) shown.buttons[p['data-testid']] = p;
    return 'button';
  },
}));
vi.mock('@/ui/elements/feedback/Alert', () => ({
  Alert: (p: AlertProps) => {
    shown.alerts.push(p);
    return 'alert';
  },
}));
// The changed rows' table sits inside the accordion, which isn't opened, so
// a table that renders is the errors table.
vi.mock('@/ui/elements/accordion/Accordion', () => ({
  Accordion: () => {
    shown.changedRows += 1;
    return 'changed rows';
  },
  AccordionItem: passThrough,
  AccordionTrigger: passThrough,
  AccordionContent: passThrough,
}));
vi.mock('@/ui/elements/table/DataTable', () => ({
  DataTable: () => {
    shown.errorTables += 1;
    return 'table';
  },
}));
vi.mock('@/ui/elements/table/tableHelpers', () => ({
  getCellDefinition: () => ({}),
}));
vi.mock('@/ui/elements/table/createLocalPagination', () => ({
  createLocalPagination: (rows: () => unknown[]) => ({
    rows,
    pagination: () => undefined,
  }),
}));
vi.mock('@/ui/utils/rem', () => ({ remToPx: (rem: number) => rem * 16 }));
vi.mock('@/intl', () => ({
  t: (key: string) => key,
  tPlural: (key: string) => key,
  formatNumber: (n: number) => String(n),
}));

import {
  ImportPreviewCard,
  ImportPreviewFooter,
  type Preview,
} from './ImportPreviewCard';

let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  shown.alerts = [];
  shown.changedRows = 0;
  shown.errorTables = 0;
  shown.buttons = {};
});

const preview = (updated: number, errorCount: number): Preview => ({
  fileId: 'f1',
  fileName: 'units.xlsx',
  summary: {
    __typename: 'CentralDataImportNode',
    tables: [
      {
        table: 'UNIT',
        inserted: 0,
        updated,
        deleted: 0,
        unchanged: 2,
        errorCount,
      },
    ],
    changes: [],
    errors: errorCount
      ? [{ sheet: 'unit', row: 3, column: 'index', message: 'no' }]
      : [],
    errorCount,
  },
});

/** Renders the card and its footer for `p`. */
const open = (p: Preview) =>
  createRoot(d => {
    dispose = d;
    resolve(ImportPreviewCard({ preview: p }));
    resolve(
      ImportPreviewFooter({
        preview: p,
        busy: false,
        downloadingErrors: false,
        onDownloadErrors: () => {},
        onConfirm: () => {},
      })
    );
  });

const alerts = () =>
  shown.alerts.map(alert => [
    alert.severity,
    alert.testId,
    resolve(alert.children),
  ]);

const importDisabled = () =>
  shown.buttons['central-data-confirm-import']!.disabled;

describe('OMS-REG-CDIO-01.212 — the preview card notice', () => {
  it('with changes and no errors, says the upload succeeded and that a problem in any row imports nothing', () => {
    open(preview(1, 0));
    expect(alerts()).toEqual([
      [
        'success',
        'central-data-upload-successful',
        'messages.central-data-upload-successful',
      ],
      [
        'info',
        'central-data-all-or-nothing',
        'messages.central-data-problem-imports-nothing',
      ],
    ]);
    expect(shown.changedRows).toBe(1);
    expect(shown.errorTables).toBe(0);
    expect(importDisabled()).toBe(false);
  });

  it('with nothing to change and no errors, says there is nothing to import', () => {
    open(preview(0, 0));
    expect(alerts()).toEqual([
      [
        'success',
        'central-data-nothing-to-import',
        'messages.central-data-nothing-to-import',
      ],
    ]);
    expect(shown.changedRows).toBe(0);
    expect(shown.errorTables).toBe(0);
    expect(importDisabled()).toBe(true);
  });

  it('with a row error, lists the errors and shows neither notice (OMS-REG-CDIO-01.15, .16)', () => {
    open(preview(1, 1));
    expect(alerts()).toEqual([]);
    expect(shown.changedRows).toBe(0);
    expect(shown.errorTables).toBe(1);
    expect(importDisabled()).toBe(true);
  });
});
