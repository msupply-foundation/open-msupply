/*
 * eslint-disable solid/reactivity -- the stand-ins read their props directly:
 * they record what they were given, which is the assertion here, and nothing
 * re-renders.
 */
/* eslint-disable solid/reactivity */
import { describe, expect, it, vi } from 'vitest';
import { createRoot } from 'solid-js';
import type { DocumentVersion } from './createDocumentForm';

/*
 * The note above a form for a document recorded under another schema version:
 * which message each version gets, its severity, and the Edit action only on
 * an archived form. Alert and Button are stand-ins that record their props, so
 * this runs without a DOM (vitest.workspace.ts, the solid project).
 */

interface Seen {
  severity: string;
  testId: string;
  text: string;
  edit: boolean;
}
const seen: Seen[] = [];

// A child as the DOM would resolve it: accessors read, arrays flattened.
const flat = (value: unknown): string[] =>
  typeof value === 'function'
    ? flat((value as () => unknown)())
    : Array.isArray(value)
      ? value.flatMap(flat)
      : typeof value === 'string'
        ? [value]
        : [];

vi.mock('../../ui/elements/feedback/Alert', () => ({
  Alert: (props: { severity: string; testId: string; children?: unknown }) => {
    const text = flat(props.children).join('');
    seen.push({
      severity: props.severity,
      testId: props.testId,
      text,
      edit: text.includes('button.edit'),
    });
    return null;
  },
}));
vi.mock('../../ui/elements/buttons/Button', () => ({
  Button: (props: { children?: unknown }) => flat(props.children).join(''),
}));
vi.mock('../../ui/icons', () => ({ EditIcon: () => null }));
// The key stands for its message, with its values in order.
vi.mock('../../intl', () => ({
  t: (key: string, values?: Record<string, string>) =>
    [key, ...Object.values(values ?? {})].join(' '),
}));

import { DocumentVersionNotice } from './DocumentVersionNotice';

const shown = (version: DocumentVersion): Seen[] => {
  seen.length = 0;
  createRoot(dispose => {
    const out = DocumentVersionNotice({ version, onEdit: () => {} });
    flat(out);
    dispose();
  });
  return [...seen];
};

describe('DocumentVersionNotice', () => {
  it('says nothing for a document on the current version', () => {
    expect(shown({ kind: 'current' })).toEqual([]);
  });

  it('offers Edit, as info, on an archived form', () => {
    expect(shown({ kind: 'archived', version: 1 })).toEqual([
      {
        severity: 'info',
        testId: 'document-version-notice',
        text: 'messages.document-archived-version button.edit',
        edit: true,
      },
    ]);
  });

  // A migrated document's problems show on its fields.
  it('says nothing for a document migrated into the current form (OMS-REG-PLG-05.81)', () => {
    expect(shown({ kind: 'migrated', version: 2 })).toEqual([]);
  });

  it.each([
    [{ kind: 'unknown' } as const, 'messages.document-unknown-version'],
    [{ kind: 'outOfStep' } as const, 'messages.document-form-out-of-step'],
    [{ kind: 'unavailable' } as const, 'messages.document-form-unavailable'],
  ])(
    'warns, with its own message and no Edit, for a document no form can open (%o)',
    (version, text) => {
      expect(shown(version)).toEqual([
        {
          severity: 'warning',
          testId: 'document-version-notice',
          text,
          edit: false,
        },
      ]);
    }
  );
});
