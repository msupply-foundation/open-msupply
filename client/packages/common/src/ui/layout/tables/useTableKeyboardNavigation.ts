import { useCallback, useEffect, useRef, useState } from 'react';
import { MRT_RowData, MRT_TableInstance } from 'material-react-table';

export const useTableKeyboardNavigation = <T extends MRT_RowData>(
  onRowClick?: (row: T, isCtrlClick: boolean) => void
) => {
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-focus the table container on mount so arrow keys work immediately
  // after navigating to a page, but only if nothing else has focus
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const active = document.activeElement;
      const isBodyOrNull = !active || active === document.body;
      if (isBodyOrNull && containerRef.current) {
        containerRef.current.focus();
      }
    });
    return () => cancelAnimationFrame(raf);
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
          const next =
            prev === null ? rowCount - 1 : Math.max(prev - 1, 0);
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
