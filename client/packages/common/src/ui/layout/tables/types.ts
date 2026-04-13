import React from 'react';
import type {
  ColumnDef as TanstackColumnDef,
  RowData,
  CellContext,
  HeaderContext,
} from '@tanstack/react-table';
import type { SxProps, Theme } from '@mui/material';
import { ColumnType } from './useGetColumnDefDefaults';
import type { MRT_DensityState } from './mrtCompat';

/** Re-export for convenience */
export type { RowData, MRT_DensityState };

/**
 * Our extended column definition type.
 *
 * Extends @tanstack/react-table's ColumnDef with:
 *  - OMS-specific metadata (description, columnType, pin, etc.)
 *  - MRT-style capitalised Cell/Header aliases so existing consumer code
 *    compiles without changes.
 *  - MUI cell-prop callbacks used in useMaterialTableColumns and a handful
 *    of consumer files.
 *  - filterVariant so useTableFiltering can recognise date/range columns.
 */
export type ColumnDef<T extends RowData> = TanstackColumnDef<T, unknown> & {
  /** Column accessor key for TanStack Table */
  accessorKey?: string;
  /** Short explanation of the column. Displayed in the column menu */
  description?: string;

  /** Maps common column types to sensible display defaults (e.g. right
   * alignment & rounding for numbers). Defaults to string. */
  columnType?: ColumnType;

  /** Display the column in the table. Use to handle columns only included for
   * certain preferences or permissions. Defaults to true */
  includeColumn?: boolean;

  /** When simplified mobile UI preference is enabled, hide the column by
   * default for small devices. Defaults to false */
  defaultHideOnMobile?: boolean;

  /** Make the column sticky to a side of the table. User can unpin */
  pin?: 'left' | 'right';

  align?: 'left' | 'center' | 'right';

  /** Specify the filter key for backend filtering */
  filterKey?: string;

  /** For date filters, specifies whether to update URL with full datetime or
   * just a (naive) date. Defaults to date-time */
  dateFilterFormat?: 'date' | 'date-time';

  /** Options for select filters */
  filterSelectOptions?: Array<{ label: string; value: string }>;

  /** Function to determine if cell should be marked as error. Cell will be
   * highlighted in red. */
  getIsError?: (row: T) => boolean;

  /** Customise the default index of the column. Used by plugins. */
  columnIndex?: number;

  /** Logical grouping for the column (e.g. 'quantities', 'pricing', 'other'). */
  columnGroup?: string;

  /** Show this column's value as read-only summary text in the card heading. */
  cardSummary?: (row: T) => React.ReactNode;

  /** Sort order for card summary items. Lower numbers appear first. */
  cardSummaryOrder?: number;

  /** Number of grid columns to span in card view. Defaults to 1. */
  cardSpan?: number;

  // ─── MRT-style capitalized renderer aliases ───────────────────────────────
  // Consumer column definitions use `Cell:` / `Header:` (capital C/H) which
  // was MRT's convention. We keep these as our canonical names and the
  // DataTable renderer reads them. @tanstack's lowercase `cell`/`header` also
  // work because we fall back to those in the renderer.
  Cell?: ((props: CellContext<T, unknown>) => React.ReactNode) | null;
  Header?: ((props: HeaderContext<T, unknown>) => React.ReactNode) | null;

  /** Rendered in grouped rows instead of the aggregation value */
  GroupedCell?: ((props: CellContext<T, unknown>) => React.ReactNode) | null;
  /** Rendered in aggregation rows */
  AggregatedCell?:
    | ((props: CellContext<T, unknown>) => React.ReactNode)
    | null;
  /** Rendered in placeholder rows */
  PlaceholderCell?:
    | ((props: CellContext<T, unknown>) => React.ReactNode)
    | null;

  /** Footer renderer - MRT-style uppercase alias */
  Footer?: ((props: HeaderContext<T, unknown>) => React.ReactNode) | null;
  footer?: ((props: HeaderContext<T, unknown>) => React.ReactNode) | null;

  // ─── Filter variant (used by useTableFiltering to pick URL updater) ────────
  filterVariant?:
    | 'date-range'
    | 'datetime-range'
    | 'select'
    | 'text'
    | 'multi-select'
    | 'range'
    | 'autocomplete'
    | 'checkbox'
    | 'range-slider';

  // ─── Per-column MUI cell-prop callbacks ──────────────────────────────────
  // Used in useMaterialTableColumns (alignment) and two consumer files.
  // The DataTable renderer calls these to get additional sx props for each cell.
  muiTableBodyCellProps?:
    | { sx?: SxProps<Theme>; [k: string]: unknown }
    | ((params: {
        table: unknown;
        row: unknown;
        cell: unknown;
        column: unknown;
        staticColumnIndex?: number;
        staticRowIndex?: number;
      }) => { sx?: SxProps<Theme>; [k: string]: unknown });

  muiTableHeadCellProps?:
    | { sx?: SxProps<Theme>; [k: string]: unknown }
    | ((params: {
        table: unknown;
        column: unknown;
        header: unknown;
      }) => { sx?: SxProps<Theme>; [k: string]: unknown });

  /** MRT date picker props for date-range filter — kept for API compat. */
  muiFilterDatePickerProps?: unknown;
  /** MRT datetime picker props — kept for API compat. */
  muiFilterDateTimePickerProps?: unknown;
};

export type DefaultCellProps<T extends RowData> = CellContext<T, unknown>;

export type ColumnDataSetter<T> = (
  rowData: Partial<T> & { id: string }
) => void;
