import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { Table } from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ColumnsIcon,
  MaximizeIcon,
  SettingsIcon,
} from '@/components/icons';
import { cx } from '@/utils/classNames';
import menu from '@/components/ui/Menu.module.css';
import { DENSITIES, type Density } from './tableTypes';
import styles from './DataTable.module.css';

/*
 * Table-local toolbar — the top-right icon cluster from the app: show/hide
 * columns, density, fullscreen. Filtering is intentionally NOT here: it's driven
 * from the page header's filter bar (one source of truth). When the table
 * collapses to cards, a sort control appears here, because the sortable column
 * headers (and their click-to-sort) are gone in card mode.
 */
export function TableToolbar<T>({
  table,
  density,
  onDensityChange,
  fullscreen,
  onToggleFullscreen,
  isCard,
}: {
  table: Table<T>;
  density: Density;
  onDensityChange: (d: Density) => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  isCard: boolean;
}) {
  const hideableColumns = table.getAllLeafColumns().filter(c => c.getCanHide());
  const sortableColumns = table.getAllLeafColumns().filter(c => c.getCanSort());
  const activeSort = table.getState().sorting[0];

  return (
    <div className={styles.toolbar}>
      {isCard && (
        <div className={styles.cardSort}>
          <label className={styles.cardSortLabel}>
            Sort by
            <select
              value={activeSort?.id ?? ''}
              onChange={e => {
                const id = e.target.value;
                table.setSorting(id ? [{ id, desc: activeSort?.desc ?? false }] : []);
              }}
            >
              <option value="">—</option>
              {sortableColumns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.columnDef.meta?.label ?? c.id}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={styles.iconButton}
            aria-label={activeSort?.desc ? 'Sort ascending' : 'Sort descending'}
            disabled={!activeSort}
            onClick={() =>
              activeSort &&
              table.setSorting([{ id: activeSort.id, desc: !activeSort.desc }])
            }
          >
            {activeSort?.desc ? <ArrowDownIcon /> : <ArrowUpIcon />}
          </button>
        </div>
      )}

      {/* Show / hide columns */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className={styles.iconButton} aria-label="Show or hide columns">
            <ColumnsIcon />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={menu.content} align="end" sideOffset={4}>
            {hideableColumns.map(column => (
              <DropdownMenu.CheckboxItem
                key={column.id}
                className={cx(menu.item, menu.checkboxItem)}
                checked={column.getIsVisible()}
                onCheckedChange={value => column.toggleVisibility(!!value)}
                onSelect={e => e.preventDefault()}
              >
                <span className={menu.checkbox}>
                  <DropdownMenu.ItemIndicator className={menu.indicator}>
                    <CheckIcon />
                  </DropdownMenu.ItemIndicator>
                </span>
                <span className={menu.label}>
                  {column.columnDef.meta?.label ?? column.id}
                </span>
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Density */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" className={styles.iconButton} aria-label="Row density">
            <SettingsIcon />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content className={menu.content} align="end" sideOffset={4}>
            <DropdownMenu.RadioGroup
              value={density}
              onValueChange={value => onDensityChange(value as Density)}
            >
              {DENSITIES.map(d => (
                <DropdownMenu.RadioItem
                  key={d.value}
                  className={cx(menu.item, menu.checkboxItem)}
                  value={d.value}
                >
                  <span className={menu.checkbox}>
                    <DropdownMenu.ItemIndicator className={menu.indicator}>
                      <CheckIcon />
                    </DropdownMenu.ItemIndicator>
                  </span>
                  <span className={menu.label}>{d.label}</span>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <button
        type="button"
        className={cx(styles.iconButton, fullscreen && styles.iconButtonActive)}
        aria-label="Toggle fullscreen"
        aria-pressed={fullscreen}
        onClick={onToggleFullscreen}
      >
        <MaximizeIcon />
      </button>
    </div>
  );
}
