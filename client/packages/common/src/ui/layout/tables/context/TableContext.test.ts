import { TableStore } from './TableContext';
import { act } from 'react-dom/test-utils';
import { renderHook } from '@testing-library/react-hooks';
import { createTableStore } from './TableContext';

describe('TableContext', () => {
  const useStore = createTableStore();

  it('sets all rows in the row state, with a selected state of false when a set of rows is set to active', () => {
    const { result } = renderHook<unknown, TableStore>(useStore);

    const { setActiveRows } = result.current;

    act(() => {
      setActiveRows(['a', 'b', 'c']);
    });

    expect(result.current.rowState['a']?.isSelected).toBe(false);
    expect(result.current.rowState['b']?.isSelected).toBe(false);
    expect(result.current.rowState['c']?.isSelected).toBe(false);
    expect(result.current.numberSelected).toBe(0);
  });

  it('sets all rows in the row state, with a previously set selected state, if set', () => {
    const { result } = renderHook<unknown, TableStore>(useStore);

    const { toggleSelected, setActiveRows } = result.current;

    act(() => {
      setActiveRows(['a', 'b', 'c']);
      toggleSelected('a');
      setActiveRows(['a', 'b', 'c']);
    });

    expect(result.current.rowState['a']?.isSelected).toBe(true);
    expect(result.current.rowState['b']?.isSelected).toBe(false);
    expect(result.current.rowState['c']?.isSelected).toBe(false);
    expect(result.current.numberSelected).toBe(1);
  });

  it('the row state has no stale rows from previous active rows', () => {
    const { result } = renderHook<unknown, TableStore>(useStore);

    const { setActiveRows } = result.current;

    act(() => {
      setActiveRows(['a', 'b', 'c', 'd']);
      setActiveRows(['a', 'b', 'c']);
    });

    expect(result.current.rowState['a']?.isSelected).toBe(false);
    expect(result.current.rowState['b']?.isSelected).toBe(false);
    expect(result.current.rowState['c']?.isSelected).toBe(false);
    expect(result.current.rowState['d']).toBeUndefined();
    expect(result.current.numberSelected).toBe(0);
  });

  it('sets a row to selected when selected and the state of the number of selected rows is updated', () => {
    const { result } = renderHook<unknown, TableStore>(useStore);

    const { toggleSelected, setActiveRows } = result.current;

    act(() => {
      setActiveRows(['a', 'b', 'c']);
      toggleSelected('a');
      toggleSelected('b');
    });

    expect(result.current.rowState['a']?.isSelected).toBe(true);
    expect(result.current.rowState['b']?.isSelected).toBe(true);
    expect(result.current.rowState['c']?.isSelected).toBe(false);
    expect(result.current.numberSelected).toBe(2);
  });

  it('sets all rows to selected when no rows are selected and toggleAll is called', () => {
    const { result } = renderHook<unknown, TableStore>(useStore);

    const { toggleAll, setActiveRows } = result.current;

    act(() => {
      setActiveRows(['a', 'b', 'c']);
      toggleAll();
    });

    expect(result.current.rowState['a']?.isSelected).toBe(true);
    expect(result.current.rowState['b']?.isSelected).toBe(true);
    expect(result.current.rowState['c']?.isSelected).toBe(true);
    expect(result.current.numberSelected).toBe(3);
  });

  it('sets all rows to selected if there is a single unselected row and toggleAll is called', () => {
    const { result } = renderHook<unknown, TableStore>(useStore);

    const { toggleSelected, toggleAll, setActiveRows } = result.current;

    act(() => {
      setActiveRows(['a', 'b', 'c']);
      toggleAll();
      toggleSelected('a');
      toggleAll();
    });

    expect(result.current.rowState['a']?.isSelected).toBe(true);
    expect(result.current.rowState['b']?.isSelected).toBe(true);
    expect(result.current.rowState['c']?.isSelected).toBe(true);
    expect(result.current.numberSelected).toBe(3);
  });

  it('sets all rows to selected if there is a single selected row and toggleAll is called', () => {
    const { result } = renderHook<unknown, TableStore>(useStore);

    const { toggleSelected, toggleAll, setActiveRows } = result.current;

    act(() => {
      setActiveRows(['a', 'b', 'c']);
      toggleSelected('a');
      toggleAll();
    });

    expect(result.current.rowState['a']?.isSelected).toBe(true);
    expect(result.current.rowState['b']?.isSelected).toBe(true);
    expect(result.current.rowState['c']?.isSelected).toBe(true);
    expect(result.current.numberSelected).toBe(3);
  });

  it('sets all rows to unselected when all rows are selected and toggleAll is called', () => {
    const { result } = renderHook<unknown, TableStore>(useStore);

    const { toggleAll, setActiveRows } = result.current;

    act(() => {
      setActiveRows(['a', 'b', 'c']);
      toggleAll();
      toggleAll();
    });

    expect(result.current.rowState['a']?.isSelected).toBe(false);
    expect(result.current.rowState['b']?.isSelected).toBe(false);
    expect(result.current.rowState['c']?.isSelected).toBe(false);
    expect(result.current.numberSelected).toBe(0);
  });
});
