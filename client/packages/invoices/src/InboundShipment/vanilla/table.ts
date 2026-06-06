import { Grid, html } from 'gridjs';
import 'gridjs/dist/theme/mermaid.css';
import { el } from './dom';
import './styles/table.css';

export interface VanillaColumn<T> {
  /** Stable id; also the sort key passed to onSort and the mobile data-label. */
  id: string;
  header: string;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
  align?: 'left' | 'right';
  /** Returns cell content. Plain text unless isHtml is set. */
  render: (row: T) => string;
  isHtml?: boolean;
}

export interface VanillaTableOptions<T> {
  columns: VanillaColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  sort?: { key: string; desc: boolean };
  onSort?: (key: string, desc: boolean) => void;
  resizable?: boolean;
  emptyMessage?: string;
}

/**
 * Thin wrapper over Grid.js used as the table *renderer* only. Sorting and
 * pagination are owned by the caller (server-side); Grid.js' own sort/search
 * are disabled. Header-click ordering and column resizing are wired manually.
 */
export class VanillaTable<T> {
  private grid: Grid;
  private columns: VanillaColumn<T>[];
  private rows: T[];
  private options: VanillaTableOptions<T>;
  private container: HTMLElement | null = null;
  /** In-session column widths (by column id), so user resizes survive re-render. */
  private widths: Record<string, string> = {};

  constructor(options: VanillaTableOptions<T>) {
    this.options = options;
    this.columns = options.columns;
    this.rows = options.rows;
    this.grid = new Grid(
      this.buildConfig() as unknown as ConstructorParameters<typeof Grid>[0]
    );
    this.grid.on('ready', () => this.wireHeaders());
    this.grid.on(
      'rowClick',
      ((e: { currentTarget: HTMLElement }) =>
        this.handleRowClick(e)) as never
    );
  }

  render(container: HTMLElement): void {
    this.container = container;
    this.grid.render(container);
  }

  /** Swap the row data (e.g. after a refetch) and re-render. */
  updateData(rows: T[]): void {
    this.captureWidths();
    this.rows = rows;
    this.grid
      .updateConfig(
        this.buildConfig() as unknown as ConstructorParameters<typeof Grid>[0]
      )
      .forceRender();
  }

  /** Reflect a new sort state (re-draws header carets). */
  updateSort(sort: { key: string; desc: boolean }): void {
    this.options.sort = sort;
    this.wireHeaders();
  }

  destroy(): void {
    try {
      this.grid.destroy();
    } catch {
      /* Grid.js can throw if already torn down; ignore. */
    }
  }

  private buildConfig(): Record<string, unknown> {
    return {
      sort: false as const,
      search: false as const,
      pagination: false as const,
      resizable: this.options.resizable ?? true,
      data: this.rows.map(row =>
        this.columns.map(col => {
          const value = col.render(row);
          return col.isHtml ? html(value) : value;
        })
      ),
      columns: this.columns.map(col => ({
        id: col.id,
        name: col.header,
        width: this.widths[col.id] ?? col.width,
        attributes: (_cell: unknown, gridRow: unknown) => {
          // gridRow is null for header cells - only label/flag data cells.
          if (gridRow === null) {
            return col.hideOnMobile ? { class: 'oms-hide-xs' } : {};
          }
          const classes = [
            col.hideOnMobile ? 'oms-hide-xs' : '',
            col.align === 'right' ? 'oms-align-right' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return { 'data-label': col.header, class: classes || undefined };
        },
      })),
      language: {
        noRecordsFound: this.options.emptyMessage ?? 'No data',
      },
    };
  }

  /** Add click-to-sort behaviour + carets to header cells after each render. */
  private wireHeaders(): void {
    if (!this.container) return;
    const ths = this.container.querySelectorAll<HTMLElement>('thead th');
    ths.forEach((th, index) => {
      const col = this.columns[index];
      if (!col) return;

      // Strip any caret we added on a previous pass.
      th.querySelector('.oms-sort-caret')?.remove();

      if (!col.sortable || !this.options.onSort) return;

      th.classList.add('oms-sortable');
      const active = this.options.sort?.key === col.id;
      const caret = el('span', {
        class: 'oms-sort-caret',
        text: active ? (this.options.sort?.desc ? ' ▼' : ' ▲') : '',
      });
      th.appendChild(caret);

      // Replace any previous handler by cloning is overkill; guard with a flag.
      if (!th.dataset['omsSortWired']) {
        th.dataset['omsSortWired'] = '1';
        th.addEventListener('click', () => {
          const isActive = this.options.sort?.key === col.id;
          const desc = isActive ? !this.options.sort?.desc : false;
          this.options.onSort?.(col.id, desc);
        });
      }
    });
  }

  private handleRowClick(e: { currentTarget: HTMLElement }): void {
    if (!this.options.onRowClick) return;
    const tr = e.currentTarget;
    const parent = tr.parentElement;
    if (!parent) return;
    const index = Array.prototype.indexOf.call(parent.children, tr);
    const row = this.rows[index];
    if (row !== undefined) this.options.onRowClick(row);
  }

  /** Read current rendered column widths so user resizes persist a re-render. */
  private captureWidths(): void {
    if (!this.container) return;
    const ths = this.container.querySelectorAll<HTMLElement>('thead th');
    ths.forEach((th, index) => {
      const col = this.columns[index];
      if (col && th.offsetWidth) this.widths[col.id] = `${th.offsetWidth}px`;
    });
  }
}
