import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { MRT_RowData, MRT_TableInstance } from 'material-react-table';

export const useTableKeyboardNavigation = <T extends MRT_RowData>(
  onRowClick?: (row: T, isCtrlClick: boolean) => void
) => {
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-focus the table container so keyboard navigation works immediately.
  // Two async cases require retries:
  //   1. cmd+k navigation: the search input is still active at layout time
  //      (the modal closes asynchronously after the route commits)
  //   2. Loading state: some pages don't render the table container immediately,
  //      so containerRef.current is null until data arrives
  // In either case, retry every 100ms (up to 10 times / ~1s) until the
  // container is available and no text input holds focus.
  useLayoutEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const maxAttempts = 10;

    const tryFocus = () => {
      const active = document.activeElement;
      const isTextInput = active?.matches('input, select, textarea');
      if (isTextInput) return;

      if (containerRef.current) {
        containerRef.current.focus();
      } else if (attempts < maxAttempts) {
        attempts++;
        timer = setTimeout(tryFocus, 100);
      }
    };

    if (document.activeElement?.matches('input, select, textarea')) {
      attempts = 1;
      timer = setTimeout(tryFocus, 100);
    } else {
      tryFocus();
    }

    return () => clearTimeout(timer);
  }, []);

  const scrollRowIntoView = useCallback((index: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rowElements = container.querySelectorAll('tbody tr');
    const rowEl = rowElements[index];
    if (rowEl) {
      rowEl.scrollIntoView({ block: 'nearest' });
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, table: MRT_TableInstance<T>) => {
      // Don't interfere when focus is inside an interactive element
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const rows = table.getRowModel().rows;
      const rowCount = rows.length;
      if (rowCount === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRowIndex(prev => {
          const next = prev === null ? 0 : Math.min(prev + 1, rowCount - 1);
          scrollRowIntoView(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRowIndex(prev => {
          const next = prev === null ? rowCount - 1 : Math.max(prev - 1, 0);
          scrollRowIntoView(next);
          return next;
        });
      } else if (e.key === 'Enter') {
        if (focusedRowIndex !== null && focusedRowIndex < rowCount) {
          e.preventDefault();
          const row = rows[focusedRowIndex];
          if (row && onRowClick) {
            onRowClick(row.original, false);
          }
        }
      } else if (e.key === 'Escape') {
        setFocusedRowIndex(null);
      }
    },
    [focusedRowIndex, onRowClick, scrollRowIntoView]
  );

  return {
    focusedRowIndex,
    setFocusedRowIndex,
    containerRef,
    handleKeyDown,
  };
};
