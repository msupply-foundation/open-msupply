import { mergeIndicatorLines } from './mergeIndicatorLines';
import {
  IndicatorColumnFragment,
  ProgramIndicatorFragment,
} from '../../RequestRequisition/api';

const column = (
  id: string,
  columnNumber: number,
  valueId: string | null
): IndicatorColumnFragment => ({
  __typename: 'IndicatorColumnNode',
  id,
  columnNumber,
  name: id,
  isActive: true,
  value: valueId
    ? { __typename: 'IndicatorValueNode', id: valueId, value: '0' }
    : null,
});

const indicator = (
  code: string,
  lineId: string,
  isActive: boolean,
  columns: IndicatorColumnFragment[]
): ProgramIndicatorFragment => ({
  __typename: 'ProgramIndicatorNode',
  id: code,
  code,
  lineAndColumns: [
    {
      __typename: 'IndicatorLineNode',
      line: {
        __typename: 'IndicatorLineRowNode',
        id: lineId,
        code: 'AZT/3TC/NVP',
        name: 'AZT/3TC/NVP',
        lineNumber: 0,
        isActive,
      },
      columns,
      customerIndicatorInfo: [],
    },
  ],
});

describe('mergeIndicatorLines', () => {
  it('ignores an inactive same-coded line with no stored values', () => {
    // HIV sorts first; its inactive line has no values for this period.
    const [entry, ...rest] = mergeIndicatorLines([
      indicator('REGIMEN', 'active', true, [column('r1', 1, 'v1')]),
      indicator('HIV', 'inactive', false, [column('h1', 1, null)]),
    ]);
    expect(rest).toHaveLength(0);
    expect(entry?.line.id).toBe('active');
    expect(entry?.line.isActive).toBe(true);
    expect(entry?.columns.map(c => c.id)).toEqual(['r1']);
    expect(entry?.columns.every(c => c.isLineActive)).toBe(true);
  });

  it('freezes only the inactive line’s cells when both lines have values', () => {
    const [entry] = mergeIndicatorLines([
      indicator('REGIMEN', 'active', true, [column('r1', 1, 'v1')]),
      indicator('HIV', 'inactive', false, [column('h1', 1, 'v2')]),
    ]);
    expect(entry?.line.id).toBe('active');
    expect(entry?.columns.map(c => [c.id, c.isLineActive])).toEqual([
      ['h1', false],
      ['r1', true],
    ]);
  });

  it('keeps an inactive line that has values, frozen', () => {
    const [entry] = mergeIndicatorLines([
      indicator('HIV', 'inactive', false, [column('h1', 1, 'v1')]),
    ]);
    expect(entry?.line.isActive).toBe(false);
    expect(entry?.columns.every(c => !c.isLineActive)).toBe(true);
  });

  it('drops a lone inactive line with no stored values', () => {
    expect(
      mergeIndicatorLines([
        indicator('HIV', 'inactive', false, [column('h1', 1, null)]),
      ])
    ).toEqual([]);
  });
});
