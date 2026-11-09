import { describe, expect, it } from 'vitest';
import { requisitionsToCsv } from './requisitionsToCsv';
import type { RequisitionRowFragment } from './requisitions.generated';

// Anchors: spec/requisitions/cases/OMS-REG-DIST-05.
//   .3 — Export produces a CSV of every requisition matching the active
//        filters ([D12]), carrying the program fields when the program columns
//        are gated on ([D17])
// The download plumbing (blob / Excel conversion) is out of scope for a unit;
// here we pin the row → CSV projection. In node the catalog isn't loaded, so
// t() falls back to its keys — header/label assertions pin keys standing in
// for the translated labels; the data cells are exact.

const row = (
  over: Partial<RequisitionRowFragment> = {}
): RequisitionRowFragment => ({
  id: 'req-1',
  requisitionNumber: 12,
  status: 'NEW',
  createdDatetime: '2026-07-15T09:00:00.000Z',
  colour: null,
  comment: 'from Tamaki',
  otherPartyName: 'Tamaki Clinic',
  otherParty: { store: { isDisabled: false } },
  approvalStatus: 'NONE',
  programName: null,
  orderType: null,
  period: null,
  shipments: { totalCount: 0 },
  ...over,
});

describe('OMS-REG-DIST-05.3 — requisitions list CSV export', () => {
  it('emits one header row plus one line per requisition, columns in list order', () => {
    const csv = requisitionsToCsv([row()], false);
    const [header, ...lines] = csv.split('\r\n');
    expect(header.split(',')).toEqual([
      'label.name',
      'label.number',
      'label.created',
      'label.status',
      'label.comment',
    ]);
    expect(lines).toHaveLength(1);
    const cells = lines[0]!.split(',');
    expect(cells[0]).toBe('Tamaki Clinic'); // customer name
    expect(cells[1]).toBe('12'); // number
    expect(cells[3]).toBe('status.new'); // status label
    expect(cells[4]).toBe('from Tamaki'); // comment
  });

  it('renders every listed requisition, preserving order', () => {
    const csv = requisitionsToCsv(
      [
        row({ id: 'a', requisitionNumber: 1 }),
        row({ id: 'b', requisitionNumber: 2 }),
        row({ id: 'c', requisitionNumber: 3 }),
      ],
      false
    );
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(4); // header + 3
    expect(lines.slice(1).map(l => l.split(',')[1])).toEqual(['1', '2', '3']);
  });

  it('adds the program trio when the program columns are gated on ([D17]), empty for non-program rows', () => {
    const csv = requisitionsToCsv(
      [
        row({
          programName: 'HIV',
          orderType: 'Normal',
          period: { name: 'July 2026' },
        }),
        row({ id: 'req-2' }),
      ],
      true
    );
    const [header, programLine, generalLine] = csv.split('\r\n');
    expect(header!.split(',').slice(5)).toEqual([
      'label.program',
      'label.order-type',
      'label.period',
    ]);
    expect(programLine!.split(',').slice(5)).toEqual([
      'HIV',
      'Normal',
      'July 2026',
    ]);
    expect(generalLine!.split(',').slice(5)).toEqual(['', '', '']);
  });

  it('projects the status label from the record', () => {
    const csv = requisitionsToCsv([row({ status: 'FINALISED' })], false);
    const cells = csv.split('\r\n')[1]!.split(',');
    expect(cells[3]).toBe('status.finalised');
  });
});
