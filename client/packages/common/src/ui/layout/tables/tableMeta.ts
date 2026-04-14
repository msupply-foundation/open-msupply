/**
 * OmsTableMeta — the "meta" object stored in table.options.meta for every
 * @tanstack/react-table instance created by useBaseMaterialTable.
 *
 * All rendering configuration that was previously passed as MRT_TableOptions
 * now lives here so that DataTable.tsx (and CardList.tsx) can read it without
 * depending on material-react-table.
 */
import type { Table, Row, RowData } from '@tanstack/react-table';
import type React from 'react';
import type { MRT_DensityState } from './mrtCompat';
import type { ManagedTableState } from './tableState/utils';
import type {
  useColumnDensity,
  useColumnOrder,
  useColumnPinning,
  useColumnSizing,
  useColumnVisibility,
} from './tableState';

export interface OmsTableMeta<T extends RowData = Record<string, unknown>> {
  // ── Density ───────────────────────────────────────────────────────────────
  density: MRT_DensityState;
  setDensity: (d: MRT_DensityState) => void;

  // ── Row interaction ───────────────────────────────────────────────────────
  onRowClick?: (row: T, isCtrlClick: boolean) => void;
  getIsPlaceholderRow?: (row: Row<T>) => boolean;
  getIsRestrictedRow?: (row: Row<T>) => boolean;

  // ── Loading / error ───────────────────────────────────────────────────────
  isLoading?: boolean;
  isError?: boolean;
  noDataElement?: React.ReactNode;

  // ── Toolbar visibility ────────────────────────────────────────────────────
  showTopToolbar: boolean;
  showBottomToolbar: boolean;

  // ── Grouping ──────────────────────────────────────────────────────────────
  isGrouped?: boolean;
  toggleGrouped?: () => void;
  groupByLabel?: string;
  isMobile?: boolean;

  // ── Feature flags ─────────────────────────────────────────────────────────
  enableVirtualization?: boolean;
  enableColumnResizing?: boolean;
  enableColumnActions?: boolean;
  enableSorting?: boolean;
  enableRowSelection?: boolean;

  // ── Bottom toolbar content ────────────────────────────────────────────────
  renderBottomToolbar?: (table: Table<T>) => React.ReactNode;
  renderBottomToolbarCustomActions?: () => React.ReactNode;
  bottomToolbarContent?: React.ReactNode; // for useSimpleMaterialTable

  // ── Settings menu state ───────────────────────────────────────────────────
  tableId: string;
  densityHook: ReturnType<typeof useColumnDensity>;
  columnSizingHook: ReturnType<typeof useColumnSizing>;
  columnVisibilityHook: ReturnType<typeof useColumnVisibility<any>>;
  columnPinningHook: ReturnType<typeof useColumnPinning<any>>;
  columnOrderHook: ReturnType<typeof useColumnOrder<any>>;
  resetTableState: () => void;
  onSaveAsGlobalDefault?: () => void;
  globalDefaults?: ManagedTableState;
}
