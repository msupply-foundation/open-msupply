/*
 * eslint-disable solid/reactivity -- the stand-ins read their props directly:
 * they record what they were given, which is the assertion here, and nothing
 * re-renders.
 */
/* eslint-disable solid/reactivity */
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';

/*
 * The fallback renderer's output: sections for groups, a labelled value for
 * each field, values formatted the way the app shows them, and the section
 * for what the schema does not declare. The layout itself is recordedView's
 * (recordedView.test.ts); FormSection, LabelledValue and Stack are stand-ins
 * that record what they are given, so this runs without a DOM
 * (vitest.workspace.ts, the solid project).
 */

const flat = (value: unknown): string[] =>
  typeof value === 'function'
    ? flat((value as () => unknown)())
    : Array.isArray(value)
      ? value.flatMap(flat)
      : typeof value === 'string'
        ? [value]
        : [];

// What was drawn, in order: a section's title opens `section: …`, a field is
// `label = value`.
const drawn: string[] = [];

vi.mock('../../ui/layout/Form/FormSection', () => ({
  FormSection: (props: { title: string; children?: unknown }) => {
    drawn.push(`section: ${props.title}`);
    return () => flat(props.children);
  },
}));
vi.mock('../../ui/elements/typography/LabelledValue', () => ({
  LabelledValue: (props: { label: unknown; children?: unknown }) => {
    drawn.push(
      `${flat(props.label).join('')} = ${flat(props.children).join('')}`
    );
    return null;
  },
}));
vi.mock('../../ui/layout/Stack/Stack', () => ({
  Stack: (props: { children?: unknown }) => () => flat(props.children),
}));
vi.mock('../../intl', () => ({
  t: (key: string) => key,
  formatNumber: (n: number) => `#${n}`,
  // A calendar date is built as the local day, whatever the zone.
  localisedDate: (d: Date) =>
    `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
  localisedDateTime: (v: string) => `at ${v}`,
}));

import { DocumentAsRecorded } from './DocumentAsRecorded';

const draw = (schema: unknown, data: unknown): string[] => {
  drawn.length = 0;
  createRoot(dispose => {
    flat(DocumentAsRecorded({ schema, data }));
    dispose();
  });
  return [...drawn];
};

const schema = {
  type: 'object',
  properties: {
    visit: { type: 'string', format: 'date-time' },
    birth: { type: 'string', format: 'date' },
    positive: { type: 'boolean' },
    weight: { type: 'number' },
    notes: { type: 'string', title: 'Visit notes' },
    referral: {
      type: 'object',
      properties: { from: { type: 'string' } },
    },
  },
};

describe('DocumentAsRecorded', () => {
  it('draws each value under its label, formatted as the app shows it', () => {
    expect(
      draw(schema, {
        visit: '2026-03-02T09:15:00Z',
        birth: '2026-02-27',
        positive: false,
        weight: 68,
        notes: 'Reports feeling well',
      })
    ).toEqual([
      'Visit = at 2026-03-02T09:15:00Z',
      'Birth = 27/2/2026',
      'Positive = common.no',
      'Weight = #68',
      'Visit notes = Reports feeling well',
    ]);
  });

  it('shows a date-time that does not parse as it was stored', () => {
    expect(draw(schema, { visit: 'next tuesday' })).toEqual([
      'Visit = next tuesday',
    ]);
  });

  it('draws a group as a section', () => {
    expect(draw(schema, { referral: { from: 'Balbala clinic' } })).toEqual([
      'section: Referral',
      'From = Balbala clinic',
    ]);
  });

  it('lists what the schema does not declare last, by path', () => {
    expect(
      draw(schema, { notes: 'a', maternalHistory: { parity: 3 } })
    ).toEqual([
      'Visit notes = a',
      'section: heading.document-undeclared-values',
      'maternalHistory.parity = #3',
    ]);
  });

  it('draws nothing for a document with no values', () => {
    expect(draw(schema, {})).toEqual([]);
  });
});
