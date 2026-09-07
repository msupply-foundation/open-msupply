import { describe, expect, it } from 'vitest';
import type { CustomFieldDef } from '../../../domain/customFields';
import { prescriptionsToCsv } from './prescriptionsToCsv';

const row = {
  id: 'p1',
  invoiceNumber: 2,
  status: 'VERIFIED' as const,
  otherPartyName: 'Malfoy, Draco',
  colour: null,
  comment: 'a comment',
  theirReference: 'ref-1',
  createdDatetime: '2026-07-23T03:15:49Z',
  backdatedDatetime: null,
  customFields: null,
};

describe('prescriptionsToCsv (OMS-REG-DIS-03.52 — the list columns, in file form)', () => {
  it('carries name, status, number, prescription date, reference, comment', () => {
    // In node the catalog isn't loaded, so t() falls back to its keys —
    // header assertions pin the keys standing in for the translated labels
    // (the locationsToCsv test's convention).
    const csv = prescriptionsToCsv([row]);
    const [header, line] = csv.trim().split(/\r?\n/);
    expect(header.split(',')).toEqual([
      'label.name',
      'label.status',
      'label.invoice-number',
      'label.prescription-date',
      'label.reference',
      'label.comment',
    ]);
    expect(line).toContain('"Malfoy, Draco"');
    expect(line).toContain('status.verified');
    expect(line).toContain('2');
    expect(line).toContain('ref-1');
  });

  // The reference store's two prominent fields (contract § definitions read) —
  // the columns issue #877 found missing from the file.
  const categoryDef: CustomFieldDef = {
    id: 'cf1',
    key: 'prescription_category',
    name: 'Category',
    valueType: 'OPTION',
    kind: 'STANDARD',
    displayMode: 'PROMINENT',
    options: [
      {
        id: 'o1',
        key: 'acute',
        name: 'Acute',
        parentOptionId: null,
        deletedDatetime: null,
      },
    ],
  };
  const patientTypeDef: CustomFieldDef = {
    id: 'cf2',
    key: 'prescription_category_2',
    name: 'Patient type',
    valueType: 'TEXT',
    kind: 'STANDARD',
    displayMode: 'PROMINENT',
    options: [],
  };
  const hiddenDef: CustomFieldDef = {
    ...patientTypeDef,
    id: 'cf3',
    key: 'internal_note',
    name: 'Internal note',
    displayMode: 'HIDDEN',
  };

  it('carries a column per configured custom field, after the list columns', () => {
    const csv = prescriptionsToCsv(
      [
        {
          ...row,
          customFields: {
            prescription_category: 'o1',
            prescription_category_2: 'Outpatient',
          },
        },
      ],
      // A HIDDEN field is not a column on screen, so it is not one in the file.
      [categoryDef, patientTypeDef, hiddenDef]
    );
    const [header, line] = csv.trim().split(/\r?\n/);
    expect(header.split(',').slice(6)).toEqual(['Category', 'Patient type']);
    // The option id resolves to its NAME, as the on-screen column shows it.
    // (sliced from the end — the patient name cell carries a quoted comma)
    expect(line.split(',').slice(-2)).toEqual(['Acute', 'Outpatient']);
  });

  it('leaves the columns off entirely when the scope configures none', () => {
    const csv = prescriptionsToCsv([row]);
    expect(csv.trim().split(/\r?\n/)[0].split(',')).toHaveLength(6);
  });

  it('dates rows by the backdated time when set (AC-L1 coalescence)', () => {
    const backdated = prescriptionsToCsv([
      { ...row, backdatedDatetime: '2026-01-05T10:00:00Z' },
    ]);
    expect(backdated).toContain('2026');
    expect(backdated.split('\n')[1]).not.toContain('23/07/2026');
  });
});
