import { TestingRouterContext } from '@openmsupply-client/common';
import { useSortedData } from './useSortedData';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-dom/test-utils';

const data = [
  { a: 2, b: 32 },
  { a: 1, b: 47 },
  { a: 5, b: 11 },
  { a: 4, b: 17 },
  { a: 3, b: 7 },
];

describe('useSortedData', () => {
  it('sorts the initially passed data array with the sort by passed', () => {
    const { result } = renderHook(() => useSortedData(data, { key: 'a' }), {
      wrapper: TestingRouterContext,
    });

    expect(result.current.sortedData).toEqual([
      expect.objectContaining({ a: 1 }),
      expect.objectContaining({ a: 2 }),
      expect.objectContaining({ a: 3 }),
      expect.objectContaining({ a: 4 }),
      expect.objectContaining({ a: 5 }),
    ]);
  });

  it('sorts the initially passed data array with the sort by passed', () => {
    const { result } = renderHook(() => useSortedData(data, { key: 'a' }), {
      wrapper: TestingRouterContext,
    });

    act(() => {
      result.current.onChangeSortBy({ key: 'b' });
    });

    expect(result.current.sortedData).toEqual([
      expect.objectContaining({ b: 7 }),
      expect.objectContaining({ b: 11 }),
      expect.objectContaining({ b: 17 }),
      expect.objectContaining({ b: 32 }),
      expect.objectContaining({ b: 47 }),
    ]);
  });
});
