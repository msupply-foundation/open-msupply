import { getCheckboxSelectionColumn } from '../columns/CheckboxSelectionColumn';
import { ColumnAlign } from '@openmsupply-client/common/src/ui/layout/tables/columns/types';
import { ColumnFormat } from '../columns/types';
import { DomainObject } from '../../../../types';
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
  | 'name'
  | 'code'
  | 'packSize'
  | 'quantity'
  | 'itemCode'
  | 'itemName'
  | 'expiry';

const getColumnLookup = <T extends DomainObject>(): Record<
  ColumnKey,
  ColumnDefinition<T>
> => ({
  expiry: {
    key: 'expiry',
    format: ColumnFormat.date,
    label: 'label.date',
    width: 75,
  },
  itemCode: {
    key: 'itemCode',
    label: 'label.code',
    width: 75,
  },
  itemName: {
    key: 'itemName',
    label: 'label.name',
    width: 75,
  },
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
  code: {
    label: 'label.code',
    key: 'code',
    width: 20,
  },
  packSize: {
    label: 'label.packSize',
    key: 'packSize',
    width: 20,
    align: ColumnAlign.Right,
  },
  quantity: {
    label: 'label.quantity',
    key: 'quantity',
    width: 20,
    align: ColumnAlign.Right,
  },
});

export class ColumnDefinitionSetBuilder<T extends DomainObject> {
  columns: ColumnDefinition<T>[];

  currentOrder: number;

  constructor() {
    this.columns = [];
    this.currentOrder = 100;
  }

  private addOrder(column?: { order?: number }) {
    if (column?.order == null) {
      return this.currentOrder++;
    }

    return column.order;
  }

  addColumns(
    columnsToCreate: (
      | ColumnDefinition<T>
      | ColumnKey
      | [ColumnKey | ColumnDefinition<T>, Omit<ColumnDefinition<T>, 'key'>]
      | [ColumnKey]
    )[]
  ): ColumnDefinitionSetBuilder<T> {
    columnsToCreate.forEach(columnDescription => {
      if (Array.isArray(columnDescription)) {
        const columnKeyOrColumnDefinition = columnDescription[0];
        const maybeColumnOptions = columnDescription[1];
        this.addColumn(columnKeyOrColumnDefinition, maybeColumnOptions);
      } else {
        this.addColumn(columnDescription);
      }
    });

    return this;
  }

  addColumn(
    columnKeyOrColumnDefinition:
      | keyof ReturnType<typeof getColumnLookup>
      | ColumnDefinition<T>,
    maybeColumnOptions?: Omit<ColumnDefinition<T>, 'key'>
  ): ColumnDefinitionSetBuilder<T> {
    const usingColumnKey = typeof columnKeyOrColumnDefinition === 'string';

    let defaultColumnOptions;

    if (usingColumnKey) {
      defaultColumnOptions = getColumnLookup<T>()[columnKeyOrColumnDefinition];
    } else {
      defaultColumnOptions = columnKeyOrColumnDefinition;
    }

    const options = {
      ...defaultColumnOptions,
      ...maybeColumnOptions,
      order: this.addOrder(
        usingColumnKey ? maybeColumnOptions : columnKeyOrColumnDefinition
      ),
    };

    const key = usingColumnKey ? columnKeyOrColumnDefinition : options.key;

    this.columns.push(createColumn<T>({ ...options, key }));

    return this;
  }

  build(): ColumnDefinition<T>[] {
    this.currentOrder = 100;
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
