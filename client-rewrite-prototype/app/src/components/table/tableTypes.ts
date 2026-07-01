import type { RowData } from '@tanstack/react-table';

/*
 * Column meta augmentation — TanStack lets us hang typed extras on a column.
 * `align` drives text alignment (the library is markup-agnostic, so alignment
 * is ours); `label` is the human name used by the columns menu and card-view
 * sort control (the `header` can be JSX, e.g. the comment icon).
 */
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'start' | 'end' | 'center';
    label?: string;
  }
}

/** Row density — mirrors the app's compact / comfortable / spacious modes. */
export type Density = 'compact' | 'comfortable' | 'spacious';

export const DENSITIES: { value: Density; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
];
