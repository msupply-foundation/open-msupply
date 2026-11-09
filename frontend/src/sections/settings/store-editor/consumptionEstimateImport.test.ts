import { describe, expect, it } from 'vitest';
import {
  applyServerResult,
  buildLines,
  buildTemplateCsv,
  monthPeriod,
  parseEstimateFile,
  pivotEstimates,
  templateMonths,
  type Estimate,
} from './consumptionEstimateImport';

// 5 November 2026
const TODAY = new Date(2026, 10, 5);

const estimate = (
  code: string,
  periodStart: string,
  periodEnd: string,
  quantity: number
): Estimate => ({
  itemId: `id-${code}`,
  item: { id: `id-${code}`, code, name: `Item ${code}` },
  periodStart,
  periodEnd,
  quantity,
});

describe('months', () => {
  it('reads a month as its first and last day', () => {
    expect(monthPeriod('2026-02')).toEqual({
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
    });
    expect(monthPeriod('2024-02')?.periodEnd).toBe('2024-02-29');
    expect(monthPeriod('2026-13')).toBeUndefined();
    expect(monthPeriod('October')).toBeUndefined();
  });

  it('offers the finished months the look-back counts, newest first', () => {
    expect(templateMonths(3, TODAY)).toEqual(['2026-10', '2026-09', '2026-08']);
    // A fractional look-back rounds up; none still offers one month
    expect(templateMonths(1.5, TODAY)).toEqual(['2026-10', '2026-09']);
    expect(templateMonths(0, TODAY)).toEqual(['2026-10']);
    // Across a year
    expect(templateMonths(2, new Date(2027, 0, 15))).toEqual([
      '2026-12',
      '2026-11',
    ]);
  });
});

describe('template', () => {
  it('has a row per item, with the current estimates filled in', () => {
    const csv = buildTemplateCsv(
      2,
      [
        { code: 'B', name: 'Item B' },
        { code: 'C', name: 'Item C' },
        { code: 'A', name: 'Item A' },
      ],
      [
        estimate('B', '2026-09-01', '2026-09-30', 30),
        estimate('A', '2026-10-01', '2026-10-31', 310),
        // Older than the look-back: still gets its column
        estimate('A', '2026-07-01', '2026-07-31', 62),
        // No longer visible in the store: still gets its row, at the end
        estimate('D', '2026-10-01', '2026-10-31', 5),
      ],
      TODAY
    );
    expect(csv.split('\r\n')).toEqual([
      'label.code,label.name,2026-10,2026-09,2026-07',
      'B,Item B,,30,',
      'C,Item C,,,',
      'A,Item A,310,,62',
      'D,Item D,5,,',
    ]);
  });
});

describe('parsing a file', () => {
  it('reads code, name and month columns, skipping blank cells and rows', () => {
    const parsed = parseEstimateFile(
      [
        'label.code,label.name,2026-10,2026-09,notes',
        'A,Item A,310,300,ignored',
        // A template row left blank
        'Z,Item Z,,,',
        'B,Item B,,30,',
        ',,,,',
      ].join('\n'),
      TODAY
    );
    expect(parsed.kind).toBe('ok');
    if (parsed.kind !== 'ok') return;
    expect(parsed.months).toEqual(['2026-10', '2026-09']);
    expect(
      parsed.rows.map(row => [row.lineNumber, row.itemCode, row.quantities])
    ).toEqual([
      [2, 'A', { '2026-10': 310, '2026-09': 300 }],
      [4, 'B', { '2026-09': 30 }],
    ]);
    // The blank template row leaves its item no estimates
    expect(parsed.blankRows).toEqual([
      { lineNumber: 3, itemCode: 'Z', itemName: 'Item Z' },
    ]);
    expect(parsed.rows.every(row => row.errors.length === 0)).toBe(true);

    const { lines, origins } = buildLines(parsed.rows);
    expect(lines).toEqual([
      {
        itemIdOrCode: 'A',
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        quantity: 310,
      },
      {
        itemIdOrCode: 'A',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        quantity: 300,
      },
      {
        itemIdOrCode: 'B',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        quantity: 30,
      },
    ]);
    expect(origins.map(origin => [origin.row.itemCode, origin.month])).toEqual([
      ['A', '2026-10'],
      ['A', '2026-09'],
      ['B', '2026-09'],
    ]);
  });

  it('rejects a missing code, a bad number and an unfinished month', () => {
    const parsed = parseEstimateFile(
      [
        'label.code,label.name,2026-11,2026-10',
        ',No code,,5',
        'A,Item A,,-1',
        'B,Item B,4,',
        'C,Item C,,lots',
      ].join('\n'),
      TODAY
    );
    if (parsed.kind !== 'ok') throw new Error('expected rows');
    expect(parsed.rows.map(row => row.errors)).toEqual([
      ['error.code-required'],
      ['error.consumption-estimate-invalid'],
      ['error.consumption-estimate-month-not-finished'],
      ['error.consumption-estimate-invalid'],
    ]);
  });

  it('rejects a month headed twice wherever it is filled in', () => {
    const parsed = parseEstimateFile(
      [
        'label.code,label.name,2026-10,2026-10,2026-09',
        'A,Item A,1,2,3',
        'B,Item B,,,4',
      ].join('\n'),
      TODAY
    );
    if (parsed.kind !== 'ok') throw new Error('expected rows');
    expect(parsed.months).toEqual(['2026-10', '2026-09']);
    expect(parsed.rows.map(row => row.errors)).toEqual([
      ['error.consumption-estimate-month-repeated'],
      [],
    ]);
  });

  it('refuses a file with no heading or no rows', () => {
    expect(parseEstimateFile('a,b\n1,2', TODAY)).toEqual({
      kind: 'failed',
      reason: 'no-header',
    });
    expect(parseEstimateFile('label.code,label.name,2026-10\n', TODAY)).toEqual(
      { kind: 'failed', reason: 'no-rows' }
    );
  });
});

describe("the server's verdict", () => {
  const parse = () => {
    const parsed = parseEstimateFile(
      [
        'label.code,label.name,2026-10,2026-09',
        'A,Item A,1,2',
        'B,Item B,,',
        'X,,3,4',
        'C,Item C,,',
      ].join('\n'),
      TODAY
    );
    if (parsed.kind !== 'ok') throw new Error('expected rows');
    return {
      rows: parsed.rows,
      blankRows: parsed.blankRows,
      ...buildLines(parsed.rows),
    };
  };

  it('puts line errors on their rows, an unknown code once', () => {
    const { rows, origins, blankRows } = parse();
    const reviewed = applyServerResult(rows, origins, blankRows, {
      __typename: 'ConsumptionEstimateLinesError',
      errors: [
        { line: 2, problem: 'ITEM_NOT_FOUND', otherLine: null },
        { line: 3, problem: 'ITEM_NOT_FOUND', otherLine: null },
      ],
      // A removal still shows beside the errors
      removedItems: [0],
    });
    expect(reviewed.map(row => [row.itemCode, row.errors])).toEqual([
      ['A', []],
      ['B', []],
      ['X', ['error.item-code-not-found']],
    ]);
    expect(reviewed[1]!.warnings).toEqual([
      'messages.consumption-estimates-removed',
    ]);
    // Rows are copied, not edited
    expect(rows[1]!.errors).toEqual([]);
    expect(reviewed[0]).toBe(rows[0]);
  });

  it('warns about months that already have recorded consumption', () => {
    const { rows, origins, blankRows } = parse();
    const reviewed = applyServerResult(rows, origins, blankRows, {
      __typename: 'ReplaceConsumptionEstimatesNode',
      overlaps: [{ line: 0, actualQuantity: 40 }],
      removedItems: [],
    });
    expect(reviewed.map(row => row.warnings)).toEqual([
      ['messages.consumption-estimate-overlaps-actual'],
      [],
    ]);
  });

  it('adds the blank rows whose estimates are removed, in file order', () => {
    const { rows, origins, blankRows } = parse();
    expect(blankRows.map(row => row.itemCode)).toEqual(['B', 'C']);
    const reviewed = applyServerResult(rows, origins, blankRows, {
      __typename: 'ReplaceConsumptionEstimatesNode',
      overlaps: [],
      // C had no estimates, so only B's are removed
      removedItems: [0],
    });
    expect(
      reviewed.map(row => [row.lineNumber, row.itemCode, row.warnings])
    ).toEqual([
      [2, 'A', []],
      [3, 'B', ['messages.consumption-estimates-removed']],
      [4, 'X', []],
    ]);
  });
});

describe('the current estimates table', () => {
  it('has a row per item and a column per month, newest first', () => {
    expect(
      pivotEstimates([
        estimate('B', '2026-09-01', '2026-09-30', 30),
        estimate('A', '2026-09-01', '2026-09-30', 300),
        estimate('A', '2026-10-01', '2026-10-31', 310),
      ])
    ).toEqual({
      months: ['2026-10', '2026-09'],
      rows: [
        {
          itemId: 'id-A',
          code: 'A',
          name: 'Item A',
          quantities: { '2026-09': 300, '2026-10': 310 },
        },
        {
          itemId: 'id-B',
          code: 'B',
          name: 'Item B',
          quantities: { '2026-09': 30 },
        },
      ],
    });
  });
});
