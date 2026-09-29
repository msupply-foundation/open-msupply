import { describe, expect, it } from 'vitest';
import type { CustomFieldDef } from '../../../domain/customFields';
import { prescriptionRequestsToCsv } from './prescriptionRequestsToCsv';

const row = {
  id: 'pr1',
  prescriptionRequestNumber: 7,
  status: 'READY_TO_DISPENSE' as const,
  createdDatetime: '2026-07-23T03:15:49Z',
  prescriptionDatetime: '2026-07-20T09:00:00Z',
  comment: 'a comment',
  patient: { id: 'pat1', name: 'Malfoy, Draco' },
  user: { username: 'poppy' },
  customFields: null,
};

describe('prescriptionRequestsToCsv (AC-L7 — the list columns, in file form)', () => {
  it('carries number, patient, status, both dates, entered by, comment', () => {
    // In node the catalog isn't loaded, so t() falls back to its keys —
    // header assertions pin the keys standing in for the translated labels
    // (the locationsToCsv test's convention).
    const csv = prescriptionRequestsToCsv([row]);
    const [header, line] = csv.trim().split(/\r?\n/);
    expect(header.split(',')).toEqual([
      'label.number',
      'label.patient',
      'label.status',
      'label.prescription-date',
      'label.created',
      'label.entered-by',
      'label.comment',
    ]);
    expect(line).toContain('7');
    expect(line).toContain('"Malfoy, Draco"');
    expect(line).toContain('status.ready-to-dispense');
    expect(line).toContain('poppy');
    expect(line).toContain('a comment');
  });

  it('leaves a missing user and comment as empty cells', () => {
    const csv = prescriptionRequestsToCsv([
      { ...row, user: null, comment: null },
    ]);
    const line = csv.trim().split(/\r?\n/)[1];
    expect(line.split(',').slice(-2)).toEqual(['', '']);
  });

  const categoryDef: CustomFieldDef = {
    id: 'cf1',
    key: 'prescription_request_category',
    name: 'Category',
    valueType: 'MULTI_OPTION',
    kind: 'BUILTIN',
    displayMode: 'PROMINENT',
    options: [
      {
        id: 'pregnant',
        key: 'pregnant',
        name: 'Pregnant',
        parentOptionId: null,
        deletedDatetime: null,
      },
    ],
  };
  const weightDef: CustomFieldDef = {
    id: 'cf2',
    key: 'prescription_request_weight',
    name: 'Weight',
    valueType: 'REAL',
    kind: 'BUILTIN',
    displayMode: 'PROMINENT',
    options: [],
  };
  const hiddenDef: CustomFieldDef = {
    ...weightDef,
    id: 'cf3',
    key: 'internal_note',
    name: 'Internal note',
    valueType: 'TEXT',
    displayMode: 'HIDDEN',
  };

  it('carries a column per configured custom field, after the list columns', () => {
    const csv = prescriptionRequestsToCsv(
      [
        {
          ...row,
          customFields: {
            [categoryDef.key]: ['pregnant'],
            [weightDef.key]: 42,
          },
        },
      ],
      // A HIDDEN field is not a column on screen, so it is not one in the file.
      [categoryDef, weightDef, hiddenDef]
    );
    const [header, line] = csv.trim().split(/\r?\n/);
    expect(header.split(',').slice(7)).toEqual(['Category', 'Weight']);
    // The option id resolves to its NAME, as the on-screen column shows it.
    expect(line.split(',').slice(-2)).toEqual(['Pregnant', '42']);
  });

  it('leaves the columns off entirely when the scope configures none', () => {
    const csv = prescriptionRequestsToCsv([row]);
    expect(csv.trim().split(/\r?\n/)[0].split(',')).toHaveLength(7);
  });
});
