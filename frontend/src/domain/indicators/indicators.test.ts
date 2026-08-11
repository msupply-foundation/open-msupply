import { describe, expect, it } from 'vitest';
import {
  applySavedIndicatorValue,
  mergeIndicatorLines,
  type IndicatorNode,
} from './indicators';

// Logic-level coverage of the shared Indicators tab (spec/internal-orders S3 §
// Indicators tab): the line merge (AC-I4) and the write-back that keeps a saved
// cell showing what was saved (#957).

type Columns = IndicatorNode['lineAndColumns'][number]['columns'];

const column = (
  id: string,
  name: string,
  valueId: string | null,
  value = '0',
  valueType: 'NUMBER' | 'STRING' | null = 'NUMBER'
): Columns[number] => ({
  id,
  name,
  columnNumber: Number(id.slice(-1)),
  valueType,
  value: valueId ? { id: valueId, value } : null,
});

const node = (
  id: string,
  code: string,
  columns: Columns,
  lineValueType: 'NUMBER' | 'STRING' | null = 'NUMBER'
): IndicatorNode => ({
  id,
  code,
  lineAndColumns: [
    {
      line: {
        id: `${id}-line`,
        code,
        name: `${code} name`,
        lineNumber: 1,
        valueType: lineValueType,
        isActive: true,
      },
      columns,
      customerIndicatorInfo: [],
    },
  ],
});

describe('mergeIndicatorLines', () => {
  it('drops columns with no stored value, and lines left with none', () => {
    const entries = mergeIndicatorLines([
      node('a', 'A', [column('c1', 'Value', 'v1', '5')]),
      node('b', 'B', [column('c2', 'Value', null)]),
    ]);
    expect(entries.map(entry => entry.code)).toEqual(['A']);
    expect(entries[0].cells).toHaveLength(1);
    expect(entries[0].cells[0].value).toBe('5');
  });

  it('types a cell from its column, falling back to its line', () => {
    // The effective type the server validates against: the column's, or the
    // line's where the column declares none (a `var` column in mSupply).
    const entries = mergeIndicatorLines([
      node(
        'a',
        'A',
        [
          column('c1', 'Value', 'v1', '', null),
          column('c2', 'Count', 'v2', '0', 'NUMBER'),
          column('c3', 'Comment', 'v3', '', 'STRING'),
        ],
        'STRING'
      ),
    ]);
    expect(entries[0].cells.map(cell => cell.type)).toEqual([
      'STRING', // no column type → the text line's
      'NUMBER', // the column's own type wins over the line's
      'STRING',
    ]);
  });

  it('takes the text input for a cell typed nowhere', () => {
    // Neither declares a type: the server validates nothing, so the cell
    // accepts anything and gets the input that says so.
    const entries = mergeIndicatorLines([
      node('a', 'A', [column('c1', 'Value', 'v1', '', null)], null),
    ]);
    expect(entries[0].cells[0].type).toBe('STRING');
  });

  it('merges the columns of same-coded lines across indicators', () => {
    const entries = mergeIndicatorLines([
      node('b', 'B', [column('c2', 'Comment', 'v2', 'later')]),
      node('a', 'A', [column('c1', 'Value', 'v1', 'first')]),
    ]);
    // One entry per line code; the alphabetically first indicator leads.
    expect(entries).toHaveLength(2);
    expect(entries.map(entry => entry.cells[0].value)).toEqual([
      'first',
      'later',
    ]);
  });
});

describe('applySavedIndicatorValue', () => {
  const nodes = [
    node('a', 'A', [column('c1', 'Value', 'v1', '5'), column('c2', 'C', 'v2')]),
    node('b', 'B', [column('c3', 'Value', 'v3', '7')]),
  ];

  it('writes the saved figure into the cell it belongs to', () => {
    const next = applySavedIndicatorValue(nodes, 'v1', '25');
    expect(mergeIndicatorLines(next)[0].cells.map(cell => cell.value)).toEqual([
      '25',
      '0',
    ]);
  });

  it('leaves every other value alone', () => {
    const next = applySavedIndicatorValue(nodes, 'v1', '25');
    expect(mergeIndicatorLines(next)[1].cells[0].value).toBe('7');
    // Untouched branches keep their identity — nothing else re-renders.
    expect(next[1].lineAndColumns[0]).toBe(nodes[1].lineAndColumns[0]);
  });

  it('is a no-op for an id no cell carries', () => {
    const next = applySavedIndicatorValue(nodes, 'gone', '25');
    expect(mergeIndicatorLines(next)).toEqual(mergeIndicatorLines(nodes));
  });
});
