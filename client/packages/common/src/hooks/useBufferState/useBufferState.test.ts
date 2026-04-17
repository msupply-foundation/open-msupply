import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { useBufferState } from './useBufferState';

describe('useBufferState', () => {
  describe('primitives', () => {
    it('initialises buffer with the provided value', () => {
      const { result } = renderHook(() => useBufferState('hello'));
      const [buffer] = result.current;
      expect(buffer).toBe('hello');
    });

    it('updates buffer when prop value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useBufferState(value),
        { initialProps: { value: 1 } }
      );

      rerender({ value: 2 });

      const [buffer] = result.current;
      expect(buffer).toBe(2);
    });

    it('does not reset buffer when prop stays the same', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useBufferState(value),
        { initialProps: { value: 'stable' } }
      );

      // Locally update the buffer
      let [buffer, setBuffer] = result.current;
      act(() => setBuffer('edited'));
      [buffer, setBuffer] = result.current;
      expect(buffer).toBe('edited');

      // Re-render with the same prop — should NOT overwrite local edit
      rerender({ value: 'stable' });
      [buffer] = result.current;
      expect(buffer).toBe('edited');
    });

    it('allows local updates via setBuffer', () => {
      const { result } = renderHook(() => useBufferState(0));

      const [_buffer, setBuffer] = result.current;
      act(() => setBuffer(42));

      const [buffer] = result.current;
      expect(buffer).toBe(42);
    });
  });

  describe('Date equality', () => {
    it('does not re-sync when a new Date object has the same timestamp', () => {
      const timestamp = new Date('2025-01-01').getTime();

      const { result, rerender } = renderHook(
        ({ value }) => useBufferState(value),
        { initialProps: { value: new Date(timestamp) } }
      );

      // Locally update the buffer
      let [buffer, setBuffer] = result.current;
      act(() => setBuffer(new Date('2099-12-31')));
      [buffer, setBuffer] = result.current;
      expect(buffer).toEqual(new Date('2099-12-31'));

      // Re-render with a new Date object that has the same original timestamp
      // — this is the scenario that previously caused an infinite loop
      rerender({ value: new Date(timestamp) });
      [buffer] = result.current;
      expect(buffer).toEqual(new Date('2099-12-31'));
    });

    it('re-syncs when the Date timestamp actually changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useBufferState(value),
        { initialProps: { value: new Date('2025-01-01') } }
      );

      rerender({ value: new Date('2025-06-15') });

      const [buffer] = result.current;
      expect(buffer).toEqual(new Date('2025-06-15'));
    });

    it('handles null Date values without error', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useBufferState<Date | null>(value),
        { initialProps: { value: null as Date | null } }
      );

      let [buffer] = result.current;
      expect(buffer).toBeNull();

      rerender({ value: new Date('2025-01-01') });
      [buffer] = result.current;
      expect(buffer).toEqual(new Date('2025-01-01'));

      rerender({ value: null });
      [buffer] = result.current;
      expect(buffer).toBeNull();
    });
  });

  describe('custom isEqual', () => {
    interface Item {
      id: string;
      label: string;
    }

    const isEqualById = (a: Item, b: Item) => a.id === b.id;

    it('uses custom comparator to determine equality', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useBufferState(value, isEqualById),
        {
          initialProps: {
            value: { id: '1', label: 'Original' } as Item,
          },
        }
      );

      // Locally edit
      let [buffer, setBuffer] = result.current;
      act(() => setBuffer({ id: '1', label: 'Edited' }));
      [buffer, setBuffer] = result.current;
      expect(buffer.label).toBe('Edited');

      // Re-render with same id but different label — should NOT overwrite
      rerender({ value: { id: '1', label: 'From server' } });
      [buffer] = result.current;
      expect(buffer.label).toBe('Edited');
    });

    it('re-syncs when custom comparator reports inequality', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useBufferState(value, isEqualById),
        {
          initialProps: {
            value: { id: '1', label: 'First' } as Item,
          },
        }
      );

      // Re-render with a different id — should overwrite
      rerender({ value: { id: '2', label: 'Second' } });
      const [buffer] = result.current;
      expect(buffer).toEqual({ id: '2', label: 'Second' });
    });
  });

  describe('setState-during-render semantics', () => {
    it('reflects new prop value in the same render pass (no stale frame)', () => {
      let renderCount = 0;
      const { result, rerender } = renderHook(
        ({ value }) => {
          renderCount++;
          return useBufferState(value);
        },
        { initialProps: { value: 'a' } }
      );

      const rendersBeforeUpdate = renderCount;
      rerender({ value: 'b' });

      // Buffer should already be 'b' — the setState-during-render pattern
      // means React re-renders synchronously, so we never observe the stale value
      const [buffer] = result.current;
      expect(buffer).toBe('b');
      // Should cause at most 2 extra renders (one for the rerender, one for the
      // synchronous setState during render), not an unbounded loop
      expect(renderCount - rendersBeforeUpdate).toBeLessThanOrEqual(2);
    });
  });
});
