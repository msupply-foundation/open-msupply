import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  MRT_RowData,
  MRT_RowVirtualizer,
  MRT_TableInstance,
} from 'material-react-table';

export const useTableKeyboardNavigation = <T extends MRT_RowData>(
  onRowClick?: (row: T, isCtrlClick: boolean) => void
) => {
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizerRef = useRef<MRT_RowVirtualizer | null>(null);

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, table: MRT_TableInstance<T>) => {
      // Don't interfere when focus is inside an interactive element
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const rows = table.getRowModel().rows;
      const rowCount = rows.length;
      if (rowCount === 0) return;

      const currentIdx = focusedRowId
        ? rows.findIndex(r => r.id === focusedRowId)
        : -1;

      const move = (nextIdx: number) => {
        setFocusedRowId(rows[nextIdx]?.id ?? null);
        rowVirtualizerRef.current?.scrollToIndex(nextIdx, { align: 'auto' });
      };

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        move(currentIdx < 0 ? 0 : Math.min(currentIdx + 1, rowCount - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        move(currentIdx < 0 ? rowCount - 1 : Math.max(currentIdx - 1, 0));
      } else if (e.key === 'Enter') {
        if (currentIdx >= 0 && onRowClick) {
          e.preventDefault();
          onRowClick(rows[currentIdx]!.original, false);
        }
      } else if (e.key === 'Escape') {
        setFocusedRowId(null);
      }
    },
    [focusedRowId, onRowClick]
  );

  return {
    focusedRowId,
    setFocusedRowId,
    containerRef,
    rowVirtualizerRef,
    handleKeyDown,
  };
};
