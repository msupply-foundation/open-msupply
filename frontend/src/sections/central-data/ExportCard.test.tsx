import { createRenderEffect, createRoot, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CentralDataExport,
  CentralDataExportCounts,
} from './centralData.generated';
import { emptyFilters } from './centralDataLogic';

/*
 * The export card (spec/central-data/ui-surface.md § export card). No e2e
 * suite reaches it: the e2e stack isn't a standalone central. Components are
 * stand-ins that record their props; centralDataLogic is real. The card's
 * rows are native table cells, and these tests run without a DOM, so
 * `template` hands out a stand-in node and `insert` only resolves what it's
 * given, which still renders the controls inside the cells.
 */

vi.mock('solid-js/web', async importOriginal => {
  const web = await importOriginal<typeof import('solid-js/web')>();
  const node = (): unknown =>
    new Proxy(() => undefined, {
      get: (_, key) => (key === Symbol.for('fake-node') ? true : node()),
      set: () => true,
      apply: () => node(),
    });
  return {
    ...web,
    template: () => node,
    // Remembers what it last put in its element, so a test can read a cell.
    insert: (_: unknown, value: unknown) => {
      const slot: { current?: unknown } = {};
      inserted.push(slot);
      web.effect(() => (slot.current = resolve(value)));
    },
  };
});

const inserted: { current?: unknown }[] = [];

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  'data-testid'?: string;
}
interface AlertProps {
  testId?: string;
  children: unknown;
}
interface CheckboxProps {
  testId: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}
interface TextFieldProps {
  'data-testid': string;
  value: string;
  placeholder?: string;
  disabled: boolean;
  onInput: (event: { currentTarget: { value: string } }) => void;
}
interface SelectProps {
  testId: string;
  value: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
}

const shown: {
  buttons: Record<string, ButtonProps>;
  alerts: AlertProps[];
  checkboxes: Record<string, CheckboxProps>;
  fields: Record<string, TextFieldProps>;
  selects: Record<string, SelectProps>;
} = { buttons: {}, alerts: [], checkboxes: {}, fields: {}, selects: {} };

// Reads a JSX child the stand-ins returned, so conditional content renders.
const resolve = (value: unknown): unknown =>
  typeof value === 'function' && !Reflect.get(value, Symbol.for('fake-node'))
    ? resolve((value as () => unknown)())
    : Array.isArray(value)
      ? value.map(resolve)
      : value;

// Layout stand-ins hand their children straight back.
vi.mock('@/ui/layout/Detail/DetailCard', () => ({
  DetailCard: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/layout/Stack/Stack', () => ({
  Stack: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/layout/Stack/HStack', () => ({
  HStack: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/elements/table/Table', () => ({
  Table: (p: { children: unknown }) => p.children,
}));
vi.mock('@/ui/elements/typography/Text', () => ({ Text: () => 'text' }));
vi.mock('@/ui/elements/buttons/Button', () => ({
  Button: (p: ButtonProps) => {
    if (p['data-testid']) shown.buttons[p['data-testid']] = p;
    return 'button';
  },
}));
// An alert leaves the list when its Show closes.
vi.mock('@/ui/elements/feedback/Alert', () => ({
  Alert: (p: AlertProps) => {
    shown.alerts.push(p);
    onCleanup(() => (shown.alerts = shown.alerts.filter(a => a !== p)));
    return 'alert';
  },
}));
vi.mock('@/ui/elements/inputs/Checkbox', () => ({
  Checkbox: (p: CheckboxProps) => {
    shown.checkboxes[p.testId] = p;
    return 'checkbox';
  },
}));
vi.mock('@/ui/elements/inputs/TextField', () => ({
  TextField: (p: TextFieldProps) => {
    shown.fields[p['data-testid']] = p;
    return 'field';
  },
}));
vi.mock('@/ui/elements/selectors/Select', () => ({
  Select: (p: SelectProps) => {
    shown.selects[p.testId] = p;
    return 'select';
  },
}));
vi.mock('@/intl', () => ({
  t: (key: string, params?: Record<string, string>) =>
    params ? `${key} ${JSON.stringify(params)}` : key,
  tPlural: (key: string, count: number) => `${key} ${count}`,
  formatNumber: (n: number) => String(n),
}));
vi.mock('@/config', () => ({ fileUrl: (id: string) => `/files?id=${id}` }));
vi.mock('@/platform/openDocument', () => ({ saveDocument: vi.fn() }));

const graphqlFetch = vi.fn();
vi.mock('@/api/graphql', () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
}));

import { saveDocument } from '@/platform/openDocument';
import { ExportCard } from './ExportCard';

const counts = (matching: number, total: number, maxRows = 100) => ({
  kind: 'success',
  data: {
    centralServer: {
      centralData: {
        exportCounts: {
          tables: [{ table: 'UNIT', matching, total }],
          maxRows,
        },
      },
    },
  },
});
const exported = (response: unknown) => ({
  kind: 'success',
  data: { centralServer: { centralData: { export: response } } },
});

let dispose: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  graphqlFetch.mockImplementation(async document =>
    document === CentralDataExportCounts ? counts(10, 10) : undefined
  );
});
afterEach(() => {
  dispose?.();
  dispose = undefined;
  shown.buttons = {};
  shown.alerts = [];
  shown.checkboxes = {};
  shown.fields = {};
  shown.selects = {};
  inserted.length = 0;
  graphqlFetch.mockReset();
  vi.mocked(saveDocument).mockReset();
  vi.useRealTimers();
});

const open = () => {
  createRoot(d => {
    dispose = d;
    const [filters, setFilters] = createStore(emptyFilters());
    const view = ExportCard({ filters, setFilters });
    createRenderEffect(() => resolve(view));
  });
};

// Lets the card's awaits run out.
const settle = () => vi.advanceTimersByTimeAsync(0);

const countRequests = () =>
  graphqlFetch.mock.calls
    .filter(([document]) => document === CentralDataExportCounts)
    .map(([, variables]) => variables);

const alerts = () =>
  shown.alerts.map(alert => [alert.testId, resolve(alert.children)]);

const download = () => shown.buttons['central-data-download']!;

/** The text the cells hold now. */
const cellTexts = () =>
  inserted.map(slot => slot.current).filter(text => typeof text === 'string');

const tickUnits = async () => {
  shown.checkboxes['central-data-export-unit']!.onChange(true);
  await settle();
};

describe('ExportCard', () => {
  it('keeps Download disabled until a table is ticked (OMS-REG-CDIO-01.3)', async () => {
    open();
    expect(download().disabled).toBe(true);
    // An unticked row's filters are off.
    expect(shown.fields['central-data-export-unit-search']!.disabled).toBe(
      true
    );
    expect(shown.selects['central-data-export-unit-status']!.disabled).toBe(
      true
    );

    await tickUnits();
    expect(download().disabled).toBe(false);
    expect(shown.fields['central-data-export-unit-search']!.disabled).toBe(
      false
    );
  });

  it('gives location types a code-or-name search and no Status filter (OMS-REG-CDIO-01.46)', async () => {
    open();
    expect(
      shown.fields['central-data-export-location_type-search']!.placeholder
    ).toBe('label.code-or-name-contains');
    // A dash in place of the Status select.
    expect(shown.selects['central-data-export-location_type-status']).toBe(
      undefined
    );

    shown.checkboxes['central-data-export-location_type']!.onChange(true);
    await settle();
    expect(countRequests()).toEqual([
      { tables: [{ table: 'LOCATION_TYPE', contains: null, isActive: null }] },
    ]);
  });

  it('gives currencies a code search and a Status filter (OMS-REG-CDIO-01.46)', async () => {
    open();
    expect(
      shown.fields['central-data-export-currency-search']!.placeholder
    ).toBe('label.code-contains');

    shown.checkboxes['central-data-export-currency']!.onChange(true);
    await settle();
    shown.selects['central-data-export-currency-status']!.onValueChange(
      'ACTIVE'
    );
    await settle();
    expect(countRequests().at(-1)).toEqual({
      tables: [{ table: 'CURRENCY', contains: null, isActive: true }],
    });
  });

  it('gives items a code-or-name search and a Status filter (OMS-REG-CDIO-01.46)', async () => {
    open();
    expect(shown.fields['central-data-export-item-search']!.placeholder).toBe(
      'label.code-or-name-contains'
    );

    shown.checkboxes['central-data-export-item']!.onChange(true);
    await settle();
    shown.selects['central-data-export-item-status']!.onValueChange('INACTIVE');
    await settle();
    expect(countRequests().at(-1)).toEqual({
      tables: [{ table: 'ITEM', contains: null, isActive: false }],
    });
  });

  it('gives users a username search and a Status filter (OMS-REG-CDIO-01.46)', async () => {
    open();
    expect(shown.fields['central-data-export-user-search']!.placeholder).toBe(
      'label.username-contains'
    );

    shown.checkboxes['central-data-export-user']!.onChange(true);
    await settle();
    shown.selects['central-data-export-user-status']!.onValueChange('ACTIVE');
    await settle();
    expect(countRequests().at(-1)).toEqual({
      tables: [{ table: 'USER', contains: null, isActive: true }],
    });
  });

  it('gives master lists a code or name search and a Status filter (OMS-REG-CDIO-01.46)', async () => {
    open();
    expect(
      shown.fields['central-data-export-master_list-search']!.placeholder
    ).toBe('label.code-or-name-contains');

    shown.checkboxes['central-data-export-master_list']!.onChange(true);
    await settle();
    shown.selects['central-data-export-master_list-status']!.onValueChange(
      'INACTIVE'
    );
    await settle();
    expect(countRequests().at(-1)).toEqual({
      tables: [{ table: 'MASTER_LIST', contains: null, isActive: false }],
    });
  });

  it('counts again after typing in Search pauses, and at once for Status (OMS-REG-CDIO-01.47)', async () => {
    open();
    await tickUnits();
    expect(countRequests()).toEqual([
      { tables: [{ table: 'UNIT', contains: null, isActive: null }] },
    ]);

    const search = shown.fields['central-data-export-unit-search']!;
    search.onInput({ currentTarget: { value: 'ta' } });
    await vi.advanceTimersByTimeAsync(100);
    search.onInput({ currentTarget: { value: 'tab' } });
    await vi.advanceTimersByTimeAsync(100);
    // Still typing: no request per keystroke.
    expect(countRequests()).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(countRequests()).toHaveLength(2);
    expect(countRequests()[1]).toEqual({
      tables: [{ table: 'UNIT', contains: 'tab', isActive: null }],
    });

    shown.selects['central-data-export-unit-status']!.onValueChange('ACTIVE');
    await settle();
    expect(countRequests()).toHaveLength(3);
    expect(countRequests()[2]).toEqual({
      tables: [{ table: 'UNIT', contains: 'tab', isActive: true }],
    });
  });

  it('counts once when Status changes while a search count is pending (OMS-REG-CDIO-01.47)', async () => {
    open();
    await tickUnits();
    shown.fields['central-data-export-unit-search']!.onInput({
      currentTarget: { value: 'tab' },
    });
    await vi.advanceTimersByTimeAsync(100);

    shown.selects['central-data-export-unit-status']!.onValueChange('ACTIVE');
    await settle();
    // The Status count already carries the search, so the pending one is dropped.
    await vi.advanceTimersByTimeAsync(1000);
    expect(countRequests()).toEqual([
      { tables: [{ table: 'UNIT', contains: null, isActive: null }] },
      { tables: [{ table: 'UNIT', contains: 'tab', isActive: true }] },
    ]);
  });

  it('shows the count the filters match in Rows, and the new one when they change (OMS-REG-CDIO-01.47)', async () => {
    open();
    // A dash until the table is ticked.
    expect(cellTexts()).toContain('—');

    await tickUnits();
    expect(cellTexts()).toContain('10');

    graphqlFetch.mockImplementation(async () => counts(3, 10));
    shown.selects['central-data-export-unit-status']!.onValueChange('ACTIVE');
    await settle();
    expect(cellTexts()).toContain(
      'label.count-of-total {"matching":"3","total":"10"}'
    );
    expect(cellTexts()).not.toContain('10');
  });

  it('warns and disables Download when the ticked tables come to more rows than an import allows (OMS-REG-CDIO-01.53)', async () => {
    graphqlFetch.mockImplementation(async () => counts(120, 150, 100));
    open();
    await tickUnits();

    expect(alerts()).toEqual([
      [
        'central-data-export-too-many',
        'error.central-data-export-too-many-rows {"rowCount":"120","maxRows":"100"}',
      ],
    ]);
    expect(download().disabled).toBe(true);

    // Narrowed under the cap, the warning goes and Download comes back.
    graphqlFetch.mockImplementation(async () => counts(80, 150, 100));
    shown.selects['central-data-export-unit-status']!.onValueChange('ACTIVE');
    await settle();
    expect(alerts()).toEqual([]);
    expect(download().disabled).toBe(false);
  });

  it("warns when the rows can't be counted, leaving Download to the server's own check (OMS-REG-CDIO-01.104)", async () => {
    graphqlFetch.mockImplementation(async () => ({ kind: 'unexpectedError' }));
    open();
    await tickUnits();

    expect(alerts()).toEqual([
      [
        'central-data-export-counts-failed',
        'error.central-data-export-counts-failed',
      ],
    ]);
    expect(cellTexts()).toContain('—');
    expect(download().disabled).toBe(false);

    // Counted on the next try, the warning goes.
    graphqlFetch.mockImplementation(async () => counts(10, 10));
    shown.selects['central-data-export-unit-status']!.onValueChange('ACTIVE');
    await settle();
    expect(alerts()).toEqual([]);
    expect(cellTexts()).toContain('10');

    // Nothing ticked is nothing counted, so no warning either.
    graphqlFetch.mockImplementation(async () => ({ kind: 'unexpectedError' }));
    shown.selects['central-data-export-unit-status']!.onValueChange('ALL');
    await settle();
    expect(alerts()).toHaveLength(1);
    shown.checkboxes['central-data-export-unit']!.onChange(false);
    await settle();
    expect(alerts()).toEqual([]);
  });

  it('empties every Search and Status on Clear filters, keeping the ticked tables (OMS-REG-CDIO-01.49)', async () => {
    open();
    await tickUnits();
    const clear = () => shown.buttons['central-data-clear-filters']!;
    expect(clear().disabled).toBe(true);

    shown.selects['central-data-export-unit-status']!.onValueChange('INACTIVE');
    shown.fields['central-data-export-unit-search']!.onInput({
      currentTarget: { value: 'tab' },
    });
    await settle();
    expect(clear().disabled).toBe(false);
    const before = countRequests().length;

    clear().onClick();
    await settle();
    expect(shown.checkboxes['central-data-export-unit']!.checked).toBe(true);
    expect(shown.fields['central-data-export-unit-search']!.value).toBe('');
    expect(shown.selects['central-data-export-unit-status']!.value).toBe('ALL');
    expect(clear().disabled).toBe(true);
    // Counted at once with no filters; the search's pending count is dropped.
    await vi.advanceTimersByTimeAsync(1000);
    expect(countRequests().slice(before)).toEqual([
      { tables: [{ table: 'UNIT', contains: null, isActive: null }] },
    ]);
  });

  describe('Download', () => {
    it('saves the workbook, showing it is busy until the save ends', async () => {
      let saved!: (result: { ok: true; saved: boolean }) => void;
      vi.mocked(saveDocument).mockReturnValueOnce(
        new Promise(resolve => (saved = resolve))
      );
      graphqlFetch.mockImplementation(async document =>
        document === CentralDataExport
          ? exported({ __typename: 'CentralDataExportNode', fileId: 'x1' })
          : counts(10, 10)
      );
      open();
      await tickUnits();

      download().onClick();
      await settle();
      expect(download().loading).toBe(true);
      expect(graphqlFetch).toHaveBeenCalledWith(CentralDataExport, {
        tables: [{ table: 'UNIT', contains: null, isActive: null }],
      });
      expect(saveDocument).toHaveBeenCalledWith(
        '/files?id=x1',
        'central_data.xlsx'
      );

      saved({ ok: true, saved: true });
      await settle();
      expect(download().loading).toBe(false);
      expect(alerts()).toEqual([]);
    });

    it('shows the server refusing an export over the cap, saving nothing (OMS-REG-CDIO-01.48)', async () => {
      graphqlFetch.mockImplementation(async document =>
        document === CentralDataExport
          ? exported({
              __typename: 'CentralDataExportError',
              error: {
                __typename: 'CentralDataTooManyRows',
                description: '',
                rowCount: 120,
                maxRows: 100,
              },
            })
          : counts(10, 10)
      );
      open();
      await tickUnits();

      download().onClick();
      await settle();
      expect(saveDocument).not.toHaveBeenCalled();
      expect(alerts()).toEqual([
        [
          'central-data-export-error',
          'error.central-data-export-too-many-rows {"rowCount":"120","maxRows":"100"}',
        ],
      ]);
      expect(download().loading).toBe(false);
    });

    // No anchor: ui-surface.md § export card names this banner, but no case
    // checks it.
    it('shows why the file could not be saved', async () => {
      vi.mocked(saveDocument).mockResolvedValueOnce({
        ok: false,
        message: 'denied',
      });
      graphqlFetch.mockImplementation(async document =>
        document === CentralDataExport
          ? exported({ __typename: 'CentralDataExportNode', fileId: 'x1' })
          : counts(10, 10)
      );
      open();
      await tickUnits();

      download().onClick();
      await settle();
      expect(alerts()).toEqual([
        [
          'central-data-export-error',
          'error.unable-to-download-file {"reason":"denied"}',
        ],
      ]);
    });
  });
});
