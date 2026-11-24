import { describe, it, expect, vi } from 'vitest';
import { createRoot, createSignal } from 'solid-js';
import { createLocalPagination } from './createLocalPagination';

const numbers = (count: number) => Array.from({ length: count }, (_, i) => i);

describe('createLocalPagination', () => {
  it('slices the rows to the page and counts them all', () =>
    createRoot(dispose => {
      const page = createLocalPagination(() => numbers(25), { pageSize: 10 });
      expect(page.rows()).toEqual(numbers(10));
      expect(page.pagination()).toMatchObject({
        offset: 0,
        pageSize: 10,
        total: 25,
      });

      page.pagination().onOffsetChange(20);
      expect(page.rows()).toEqual([20, 21, 22, 23, 24]);
      page.reset();
      expect(page.pagination().offset).toBe(0);
      dispose();
    }));

  it('follows the rows it is given', () =>
    createRoot(dispose => {
      const [rows, setRows] = createSignal(numbers(5));
      const page = createLocalPagination(rows, { pageSize: 10 });
      setRows(numbers(12));
      expect(page.pagination().total).toBe(12);
      expect(page.rows()).toHaveLength(10);
      dispose();
    }));

  it('fixes the page size unless asked to let it change', () =>
    createRoot(dispose => {
      const fixed = createLocalPagination(() => numbers(25), { pageSize: 10 });
      expect(fixed.pagination().onPageSizeChange).toBeUndefined();

      const remember = vi.fn();
      const page = createLocalPagination(() => numbers(25), {
        pageSize: 10,
        onPageSizeChange: remember,
      });
      page.pagination().onOffsetChange(10);
      page.pagination().onPageSizeChange?.(20);
      expect(remember).toHaveBeenCalledWith(20);
      expect(page.pagination()).toMatchObject({ offset: 0, pageSize: 20 });
      expect(page.rows()).toEqual(numbers(20));
      dispose();
    }));
});
