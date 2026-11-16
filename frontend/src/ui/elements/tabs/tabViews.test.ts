import { createRoot, createSignal, mapArray } from 'solid-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import { createTabViews, describeTabs } from './tabViews';
import type { StepMark, TabDef } from './Tabs';

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});

// A tender's tabs: Summary and Log either side of four steps.
const tenderTabs = (
  marks: StepMark[],
  notes: Record<string, string> = {}
): TabDef[] => [
  { value: 'summary', label: 'Summary' },
  ...['plan', 'items', 'source', 'evaluate'].map((value, index) => ({
    value,
    label: value[0].toUpperCase() + value.slice(1),
    step: { mark: marks[index], attention: notes[value] },
  })),
  { value: 'log', label: 'Log' },
];

const ADVERTISED: StepMark[] = ['done', 'done', 'current', 'notStarted'];

describe('describeTabs', () => {
  const views = describeTabs(tenderTabs(ADVERTISED));
  const pick = <K extends 'number' | 'stepMark' | 'ariaCurrent' | 'connector'>(
    key: K
  ) =>
    Object.fromEntries([...views].map(([value, view]) => [value, view[key]]));

  it('numbers the steps 1 to n, skipping plain tabs', () => {
    expect(pick('number')).toEqual({
      summary: undefined,
      plan: 1,
      items: 2,
      source: 3,
      evaluate: 4,
      log: undefined,
    });
  });

  it('gives each step its e2e mark, and plain tabs none', () => {
    expect(pick('stepMark')).toEqual({
      summary: undefined,
      plan: 'done',
      items: 'done',
      source: 'current',
      evaluate: 'not-started',
      log: undefined,
    });
  });

  it('puts aria-current only on the current step', () => {
    expect(pick('ariaCurrent')).toEqual({
      summary: undefined,
      plan: undefined,
      items: undefined,
      source: 'step',
      evaluate: undefined,
      log: undefined,
    });
  });

  it('joins only adjacent steps, solid into a step the record has reached', () => {
    expect(pick('connector')).toEqual({
      summary: undefined,
      plan: undefined, // the tab before it is Summary
      items: { reached: true },
      source: { reached: true },
      evaluate: { reached: false },
      log: undefined,
    });
  });

  it('breaks the line where a plain tab sits between two steps', () => {
    const tabs = tenderTabs(ADVERTISED);
    tabs.splice(3, 0, { value: 'notes', label: 'Notes' });
    expect(describeTabs(tabs).get('source')?.connector).toBeUndefined();
  });

  it('names a step by label, mark and any attention note; a plain tab by its label', () => {
    const named = describeTabs(
      tenderTabs(ADVERTISED, { source: 'Incoterm not filled in' })
    );
    expect(named.get('summary')?.ariaLabel).toBeUndefined();
    expect(named.get('plan')?.ariaLabel).toBe('Plan, Done');
    expect(named.get('source')?.ariaLabel).toBe(
      'Source, Current step. Needs attention: Incoterm not filled in'
    );
  });
});

/*
 * The strip keeps a tab's trigger while the record's marks change. TabList
 * draws one <For> row per value; mapArray is what <For> runs, so a row kept
 * here is a trigger (and any focus on it) kept on screen. The focus itself was
 * checked in the browser: this suite has no DOM. mapArray updates one array
 * in place, so each test copies the rows before changing the tabs.
 */
describe('createTabViews', () => {
  it('keeps every row when the tabs are rebuilt with new marks', () => {
    createRoot(dispose => {
      const [tabs, setTabs] = createSignal(tenderTabs(ADVERTISED));
      const { values, view } = createTabViews(tabs);
      const rows = mapArray(values, value => ({ value }));

      const before = [...rows()];
      setTabs(tenderTabs(['done', 'done', 'done', 'current']));
      const after = rows();

      expect(after).toHaveLength(before.length);
      after.forEach((row, index) => expect(row).toBe(before[index]));
      expect(view('source').stepMark).toBe('done');
      expect(view('evaluate').ariaCurrent).toBe('step');
      dispose();
    });
  });

  it('adds and drops only the rows whose tabs come and go', () => {
    createRoot(dispose => {
      const start = tenderTabs(ADVERTISED);
      const [tabs, setTabs] = createSignal(start);
      const rows = mapArray(createTabViews(tabs).values, value => ({ value }));

      const before = [...rows()];
      setTabs(start.filter(tab => tab.value !== 'log'));
      const after = rows();

      expect(after.map(row => row.value)).not.toContain('log');
      after.forEach(row =>
        expect(row).toBe(before.find(b => b.value === row.value))
      );
      dispose();
    });
  });
});
