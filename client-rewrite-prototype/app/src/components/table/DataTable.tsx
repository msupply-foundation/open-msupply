import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table,
} from '@tanstack/react-table';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { cx } from '@/utils/classNames';
import { useSelectionFooter } from '@/stores/selectionFooter';
import { HeaderCell } from './HeaderCell';
import { TableToolbar } from './TableToolbar';
import { Pagination } from './Pagination';
import { CardList } from './CardList';
import { Checkbox } from './Checkbox';
import { useContainerWidth } from './useContainerWidth';
import type { Density } from './tableTypes';
import styles from './DataTable.module.css';

const CARD_BREAKPOINT = 640; // px — below this the table becomes a card list
const NO_FILTERS: ColumnFiltersState = []; // stable default reference
const ROW_HEIGHT: Record<Density, number> = {
  compact: 32,
  comfortable: 40,
  spacious: 52,
};

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  getRowId: (row: T) => string;
  /** Column pinned sticky to the inline-start edge (in addition to selection). */
  stickyColumnId: string;
  /** Filter state, controlled from outside (the header filter bar → URL). */
  columnFilters?: ColumnFiltersState;
  enableSelection?: boolean;
  /** Window rows instead of paginating — the large-list / benchmark path. */
  virtualise?: boolean;
  isRestricted?: (row: T) => boolean;
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  stickyColumnId,
  columnFilters = NO_FILTERS,
  enableSelection = true,
  virtualise = false,
  isRestricted,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnSizing, setColumnSizing] = useState({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [density, setDensity] = useState<Density>('comfortable');
  const [fullscreen, setFullscreen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Selection checkbox column, prepended when enabled. Pinned + not hideable.
  const selectColumn = useMemo<ColumnDef<T>>(
    () => ({
      id: 'select',
      size: 48,
      enableSorting: false,
      enableResizing: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          indeterminate={table.getIsSomeRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          label="Select row"
        />
      ),
      meta: { align: 'center' },
    }),
    []
  );

  const allColumns = useMemo(
    () => (enableSelection ? [selectColumn, ...columns] : columns),
    [enableSelection, selectColumn, columns]
  );

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() =>
    allColumns.map(c => c.id as string)
  );

  const pinnedLeft = enableSelection
    ? ['select', stickyColumnId]
    : [stickyColumnId];

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    state: {
      sorting,
      columnFilters,
      columnOrder,
      columnVisibility,
      columnSizing,
      rowSelection,
      ...(virtualise ? {} : { pagination }),
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    enableRowSelection: enableSelection,
    enableMultiSort: false,
    enableSortingRemoval: true,
    columnResizeMode: 'onChange',
    initialState: { columnPinning: { left: pinnedLeft } },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(virtualise ? {} : { getPaginationRowModel: getPaginationRowModel() }),
  });

  const rows = table.getRowModel().rows;
  const totalRows = table.getFilteredRowModel().rows.length;

  // Column widths are published as CSS variables on the <table>, so a resize
  // mutates one custom property and the cascade re-sizes cells — no React
  // re-render of the body (see the memoised body during resize below).
  const { columnSizingInfo, columnSizing: sizing } = table.getState();
  const columnSizeVars = useMemo(() => {
    const vars: Record<string, string> = {};
    for (const header of table.getFlatHeaders()) {
      vars[`--h-${header.id}-size`] = String(header.getSize());
      vars[`--c-${header.column.id}-size`] = String(header.column.getSize());
    }
    return vars;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnSizingInfo, sizing, columnVisibility, columnOrder]);

  // --- sort-change announcement (aria-live) -------------------------------
  const [announcement, setAnnouncement] = useState('');
  const firstSort = useRef(true);
  useEffect(() => {
    if (firstSort.current) {
      firstSort.current = false;
      return;
    }
    const active = sorting[0];
    if (!active) {
      setAnnouncement('Sorting cleared');
      return;
    }
    const label = table.getColumn(active.id)?.columnDef.meta?.label ?? active.id;
    setAnnouncement(`Sorted by ${label}, ${active.desc ? 'descending' : 'ascending'}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting]);

  // --- publish selection to the context-aware ContentFooter ---------------
  const publish = useSelectionFooter(s => s.publish);
  const reset = useSelectionFooter(s => s.reset);
  const selectedCount = Object.keys(rowSelection).length;
  useEffect(() => {
    const clear = () => setRowSelection({});
    publish({ count: selectedCount, onClear: clear, onDelete: clear, onCopy: clear });
  }, [selectedCount, publish]);
  useEffect(() => () => reset(), [reset]);

  // --- column reorder (dnd-kit) ------------------------------------------
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setColumnOrder(prev => {
      const from = prev.indexOf(active.id as string);
      const to = prev.indexOf(over.id as string);
      return from < 0 || to < 0 ? prev : arrayMove(prev, from, to);
    });
  };
  const visibleColumnIds = table.getVisibleLeafColumns().map(c => c.id);

  // --- card view switch ---------------------------------------------------
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useContainerWidth(containerRef);
  const isCard = width > 0 && width < CARD_BREAKPOINT;

  // --- virtualisation -----------------------------------------------------
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT[density],
    overscan: 12,
  });

  const handleRowClick = (row: Row<T>) => setActiveRowId(row.id);

  const bodyProps = {
    rows,
    pageStart: virtualise ? 0 : pagination.pageIndex * pagination.pageSize,
    activeRowId,
    onRowClick: handleRowClick,
    isRestricted,
  };
  const isResizing = !!columnSizingInfo.isResizingColumn;

  return (
    <div
      ref={containerRef}
      className={cx(styles.container, fullscreen && styles.fullscreen)}
    >
      <TableToolbar
        table={table}
        density={density}
        onDensityChange={setDensity}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen(f => !f)}
        isCard={isCard}
      />

      {isCard ? (
        <CardList
          rows={rows}
          primaryColumnId={stickyColumnId}
          activeRowId={activeRowId}
          onRowClick={handleRowClick}
          isRestricted={isRestricted}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={handleDragEnd}
        >
          <div
            className={cx(styles.scroll, virtualise && styles.scrollViewport)}
            ref={scrollRef}
          >
            <table
              className={styles.table}
              data-density={density}
              // At least fill the container (fixed layout distributes the slack
              // across columns, like the app's grid layout); overflow → scroll
              // once the columns are wider than the container.
              style={{
                ...columnSizeVars,
                width: `max(100%, ${table.getTotalSize()}px)`,
              }}
              aria-rowcount={totalRows + 1}
            >
              <thead className={styles.thead}>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id} aria-rowindex={1} className={styles.headRow}>
                    <SortableContext
                      items={visibleColumnIds}
                      strategy={horizontalListSortingStrategy}
                    >
                      {hg.headers.map(header => (
                        <HeaderCell key={header.id} header={header} table={table} />
                      ))}
                    </SortableContext>
                  </tr>
                ))}
              </thead>

              {virtualise ? (
                <VirtualBody
                  {...bodyProps}
                  virtualizer={rowVirtualizer}
                  table={table}
                />
              ) : isResizing ? (
                <MemoBody {...bodyProps} />
              ) : (
                <TableBody {...bodyProps} />
              )}
            </table>
          </div>
        </DndContext>
      )}

      {!virtualise && !isCard && <Pagination table={table} />}

      <div role="status" aria-live="polite" className={styles.srOnly}>
        {announcement}
      </div>
    </div>
  );
}

/* ---- body rendering ---------------------------------------------------- */

interface BodyProps<T> {
  rows: Row<T>[];
  pageStart: number;
  activeRowId: string | null;
  onRowClick: (row: Row<T>) => void;
  isRestricted?: (row: T) => boolean;
}

function BodyRow<T>({
  row,
  rowIndex,
  activeRowId,
  onRowClick,
  isRestricted,
  style,
}: {
  row: Row<T>;
  rowIndex: number;
  activeRowId: string | null;
  onRowClick: (row: Row<T>) => void;
  isRestricted?: (row: T) => boolean;
  style?: CSSProperties;
}) {
  const restricted = isRestricted?.(row.original) ?? false;
  return (
    <tr
      aria-rowindex={rowIndex + 2} // +1 for 1-based, +1 for the header row
      className={styles.tr}
      style={style}
      data-odd={rowIndex % 2 === 1 || undefined}
      data-selected={row.getIsSelected() || undefined}
      data-active={activeRowId === row.id || undefined}
      data-restricted={restricted || undefined}
      onClick={() => onRowClick(row)}
    >
      {row.getVisibleCells().map(cell => {
        const col = cell.column;
        const pinned = col.getIsPinned() === 'left';
        return (
          <td
            key={cell.id}
            data-align={col.columnDef.meta?.align ?? 'start'}
            className={cx(styles.td, pinned && styles.pinned)}
            style={{
              width: `calc(var(--c-${col.id}-size) * 1px)`,
              ...(pinned ? { insetInlineStart: `${col.getStart('left')}px` } : {}),
            }}
          >
            {flexRender(col.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
}

function TableBody<T>({ rows, pageStart, ...rest }: BodyProps<T>) {
  return (
    <tbody>
      {rows.map((row, i) => (
        <BodyRow key={row.id} row={row} rowIndex={pageStart + i} {...rest} />
      ))}
    </tbody>
  );
}

// Rendered only while a column is being resized: identical props, so React skips
// re-rendering the body — the CSS variables on <table> re-size the cells instead.
const MemoBody = memo(TableBody) as typeof TableBody;

function VirtualBody<T>({
  rows,
  activeRowId,
  onRowClick,
  isRestricted,
  virtualizer,
  table,
}: BodyProps<T> & {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  table: Table<T>;
}) {
  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length ? items[0].start : 0;
  const paddingBottom = items.length
    ? virtualizer.getTotalSize() - items[items.length - 1].end
    : 0;
  const colSpan = table.getVisibleLeafColumns().length;

  return (
    <tbody>
      {paddingTop > 0 && (
        <tr aria-hidden>
          <td style={{ height: paddingTop }} colSpan={colSpan} />
        </tr>
      )}
      {items.map(item => {
        const row = rows[item.index];
        return (
          <BodyRow
            key={row.id}
            row={row}
            rowIndex={item.index}
            activeRowId={activeRowId}
            onRowClick={onRowClick}
            isRestricted={isRestricted}
          />
        );
      })}
      {paddingBottom > 0 && (
        <tr aria-hidden>
          <td style={{ height: paddingBottom }} colSpan={colSpan} />
        </tr>
      )}
    </tbody>
  );
}
