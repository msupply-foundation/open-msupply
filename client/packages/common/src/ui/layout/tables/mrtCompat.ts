/**
 * Type compatibility shim: re-exports @tanstack/react-table types under the
 * MRT type names that were previously imported from material-react-table.
 *
 * Allows all internal table files and consumer components to keep their
 * existing type annotations without any modifications. Add new aliases here
 * if future files need additional MRT type names.
 */
import type {
  RowData,
  Cell,
  ColumnDef,
  Row,
  Table,
  Column,
  ColumnPinningState,
  ColumnSizingState,
  VisibilityState,
  ColumnFiltersState,
  SortingState,
  PaginationState,
  RowSelectionState,
  GroupingState,
  Updater,
} from '@tanstack/react-table';

/** MRT-specific density type — not in @tanstack/react-table */
export type MRT_DensityState = 'compact' | 'comfortable' | 'spacious';

/** Column order state is just a plain string array */
export type MRT_ColumnOrderState = string[];

// Type aliases for MRT compatibility
export type MRT_RowData = RowData;
export type MRT_ColumnDef<T extends MRT_RowData> = ColumnDef<T, unknown>;
export type MRT_Row<T extends MRT_RowData> = Row<T>;
export type MRT_TableInstance<T extends MRT_RowData> = Table<T>;
export type MRT_Column<T extends MRT_RowData> = Column<T>;
export type MRT_Cell<T extends MRT_RowData, V = unknown> = Cell<T, V>;
export type MRT_ColumnPinningState = ColumnPinningState;
export type MRT_ColumnSizingState = ColumnSizingState;
export type MRT_VisibilityState = VisibilityState;
export type MRT_ColumnFiltersState = ColumnFiltersState;
export type MRT_SortingState = SortingState;
export type MRT_PaginationState = PaginationState;
export type MRT_RowSelectionState = RowSelectionState;
export type MRT_GroupingState = GroupingState;
export type MRT_Updater<T> = Updater<T>;

/**
 * Minimal stand-in for MRT_TableOptions used only for typing onChange callbacks
 * in the tableState hooks. We only include the properties we actually reference.
 */
export interface MRT_TableOptions<_TData extends MRT_RowData = MRT_RowData> {
  onColumnOrderChange?: (updater: MRT_Updater<MRT_ColumnOrderState>) => void;
  onColumnVisibilityChange?: (
    updater: MRT_Updater<MRT_VisibilityState>
  ) => void;
  onColumnPinningChange?: (
    updater: MRT_Updater<MRT_ColumnPinningState>
  ) => void;
  onColumnSizingChange?: (updater: MRT_Updater<MRT_ColumnSizingState>) => void;
  onGroupingChange?: (updater: MRT_Updater<MRT_GroupingState>) => void;
  onDensityChange?: (updater: MRT_Updater<MRT_DensityState>) => void;
}