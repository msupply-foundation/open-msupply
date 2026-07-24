import { describe, expect, it } from 'vitest';
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

describe('prescriptionsToCsv (AC-L4 — the list columns, in file form)', () => {
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

  it('dates rows by the backdated time when set (AC-L1 coalescence)', () => {
    const backdated = prescriptionsToCsv([
      { ...row, backdatedDatetime: '2026-01-05T10:00:00Z' },
    ]);
    expect(backdated).toContain('2026');
    expect(backdated.split('\n')[1]).not.toContain('23/07/2026');
  });
});
