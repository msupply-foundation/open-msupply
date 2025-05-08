import { getDosesPerUnitColumn } from '../DosesPerUnitColumn';
import { UNDEFINED_STRING_VALUE } from '@openmsupply-client/common';

type RowData = {
  id: string;
  item?: {
    __typename: 'ItemNode';
    id: string;
    code: string;
    name: string;
    isVaccine: boolean;
    doses: number;
  } | null;
};

const mockTranslation = jest.fn((key: string) =>
  key === 'multiple' ? 'Multiple' : key
);

const getAccessorValue = (rowData: RowData) => {
  const column = getDosesPerUnitColumn(mockTranslation);
  return column.accessor ? column.accessor({ rowData }) : undefined;
};

describe('getDosesPerUnitColumn: for single items', () => {
  it('returns doses for a vaccine item', () => {
    const rowData: RowData = {
      id: '1',
      item: {
        __typename: 'ItemNode',
        id: 'item1',
        code: 'code1',
        name: 'VaccineA',
        isVaccine: true,
        doses: 5,
      },
    };
    expect(getAccessorValue(rowData)).toBe(5);
  });

  it('returns - for a non-vaccine item', () => {
    const rowData: RowData = {
      id: '2',
      item: {
        __typename: 'ItemNode',
        id: 'item2',
        code: 'code2',
        name: 'NormalA',
        isVaccine: false,
        doses: 0,
      },
    };
    expect(getAccessorValue(rowData)).toBe(UNDEFINED_STRING_VALUE);
  });
});

describe('getDosesPerUnitColumn: for multiple lines', () => {
  it('returns the same dose when all lines have the same dose', () => {
    const rowData = {
      id: '1',
      lines: [
        { id: 'line1', item: { isVaccine: true, doses: 10 } },
        { id: 'line2', item: { isVaccine: true, doses: 10 } },
      ],
    };
    expect(getAccessorValue(rowData)).toBe(10);
  });

  it('returns "Multiple" when lines have different doses', () => {
    const rowData = {
      id: '1',
      lines: [
        { id: 'line1', item: { isVaccine: true, doses: 10 } },
        { id: 'line2', item: { isVaccine: true, doses: 5 } },
      ],
    };
    expect(getAccessorValue(rowData)).toBe('Multiple');
  });

  it('returns - for non-vaccine lines', () => {
    const rowData = {
      id: '1',
      lines: [
        { id: 'line1', item: { isVaccine: false } },
        { id: 'line2', item: { isVaccine: false } },
      ],
    };
    expect(getAccessorValue(rowData)).toBe(UNDEFINED_STRING_VALUE);
  });
});
