import { getCheckboxSelectionColumn } from './../columns/CheckboxSelectionColumn';
import { ColumnAlign } from '@openmsupply-client/common/src/ui/layout/tables/columns/types';
import { ColumnFormat } from './../columns/types';
import { DomainObject } from './../../../../types';
import { ColumnDefinition } from '../columns/types';

const createColumn = <T extends DomainObject>(
  column: ColumnDefinition<T>
): ColumnDefinition<T> => {
  return column;
};

export type ColumnKey =
  | 'invoiceNumber'
  | 'type'
  | 'status'
  | 'entered'
  | 'confirmed'
  | 'total'
  | 'comment'
  | 'selection'
  | 'name';

const getColumnLookup = <T extends DomainObject>(): Record<
  ColumnKey,
  ColumnDefinition<T>
> => ({
  name: {
    key: 'name',
    label: 'label.name',
    width: 75,
  },
  invoiceNumber: {
    key: 'invoiceNumber',
    label: 'label.invoice-number',
    width: 75,
  },
  type: {
    label: 'label.type',
    key: 'type',
    width: 150,
  },
  status: {
    label: 'label.status',
    key: 'status',
    width: 100,
  },
  entered: {
    label: 'label.entered',
    key: 'entered',
    format: ColumnFormat.date,
    width: 100,
  },
  confirmed: {
    label: 'label.confirmed',
    key: 'confirmed',
    format: ColumnFormat.date,
    width: 100,
  },

  total: {
    label: 'label.total',
    key: 'total',
    width: 75,
    align: ColumnAlign.Right,
  },
  comment: {
    label: 'label.comment',
    key: 'comment',
    width: 250,
  },
  selection: getCheckboxSelectionColumn(),
});

export class ColumnSetBuilder<T extends DomainObject> {
  columns: ColumnDefinition<T>[];

  currentOrder: number;

  constructor() {
    this.columns = [];
    this.currentOrder = 0;
  }

  private addOrder(column?: { order?: number }) {
    if (column?.order == null) {
      return this.currentOrder++;
    }

    return column.order;
  }

  addColumn(
    columnKey: keyof ReturnType<typeof getColumnLookup>,
    columnOptions?: Omit<ColumnDefinition<T>, 'key'>
  ): ColumnSetBuilder<T> {
    const defaultColumnOptions = getColumnLookup<T>()[columnKey];

    const options = {
      ...defaultColumnOptions,
      ...columnOptions,
      order: this.addOrder(columnOptions),
    };

    this.columns.push(createColumn<T>({ ...options, key: columnKey }));

    return this;
  }

  build(): ColumnDefinition<T>[] {
    this.currentOrder = 0;
    const sortedColumns = this.columns.sort((a, b) => {
      const { order: aOrder = 0 } = a;
      const { order: bOrder = 0 } = b;

      if (aOrder < bOrder) {
        return -1;
      } else {
        return 1;
      }
    });

    this.columns = [];

    return sortedColumns;
  }
}
