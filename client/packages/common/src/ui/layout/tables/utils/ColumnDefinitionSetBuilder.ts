import { getCheckboxSelectionColumn } from '../columns/CheckboxSelectionColumn';
import { ColumnAlign, ColumnFormat } from '../columns/types';
import { Formatter } from '@common/utils';
import { RecordWithId } from '@common/types';
import { ColumnDefinition } from '../columns/types';

const createColumn = <T extends RecordWithId>(
  column: ColumnDefinition<T>
): ColumnDefinition<T> => {
  return column;
};

export type ColumnKey =
  | 'invoiceNumber'
  | 'type'
  | 'status'
  | 'createdDatetime'
  | 'allocatedDatetime'
  | 'totalAfterTax'
  | 'comment'
  | 'selection'
  | 'name'
  | 'code'
  | 'packSize'
  | 'quantity'
  | 'itemCode'
  | 'itemName'
  | 'itemUnit'
  | 'expiryDate'
  | 'batch'
  | 'costPricePerPack'
  | 'sellPricePerPack'
  | 'sellPricePerUnit'
  | 'locationName'
  | 'unitQuantity'
  | 'numberOfPacks'
  | 'otherPartyName'
  | 'lineTotal'
  | 'stocktakeNumber'
  | 'description'
  | 'stocktakeDate'
  | 'monthlyConsumption'
  | 'requestedQuantity'
  | 'supplyQuantity'
  | 'stockOnHand';

const getColumnLookup = <T extends RecordWithId>(): Record<
  ColumnKey,
  ColumnDefinition<T>
> => ({
  monthlyConsumption: {
    key: 'monthlyConsumption',
    label: 'label.amc',
    description: 'description.average-monthly-consumption',
    align: ColumnAlign.Left,
    width: 100,
  },

  numberOfPacks: {
    key: 'numberOfPacks',
    format: ColumnFormat.Integer,
    align: ColumnAlign.Right,
    description: 'description.pack-quantity',
    label: 'label.pack-quantity',
    width: 100,
  },
  expiryDate: {
    key: 'expiryDate',
    label: 'label.expiry',
    width: 100,
    formatter: dateString =>
      dateString
        ? Formatter.expiryDate(new Date(dateString as string)) || ''
        : '',
  },

  itemCode: {
    key: 'itemCode',
    label: 'label.code',
    width: 100,
  },
  itemName: {
    key: 'itemName',
    label: 'label.name',
    maxWidth: 400,
  },
  name: {
    key: 'name',
    label: 'label.name',
    width: 75,
  },
  otherPartyName: {
    key: 'otherPartyName',
    label: 'label.name',
    width: 75,
    sortable: false,
  },
  stocktakeNumber: {
    key: 'stocktakeNumber',
    label: 'label.number',
    width: 50,
  },
  invoiceNumber: {
    key: 'invoiceNumber',
    align: ColumnAlign.Right,
    label: 'label.invoice-number',
    width: 50,
  },
  type: {
    label: 'label.type',
    key: 'type',
    width: 150,
  },
  status: {
    label: 'label.status',
    key: 'status',
    width: 75,
  },
  createdDatetime: {
    description: 'description.entered',
    label: 'label.entered',
    key: 'createdDatetime',
    format: ColumnFormat.Date,
    width: 100,
  },
  stocktakeDate: {
    label: 'label.date',
    key: 'stocktakeDate',
    format: ColumnFormat.Date,
    width: 100,
  },
  allocatedDatetime: {
    label: 'label.confirmed',
    key: 'allocatedDatetime',
    format: ColumnFormat.Date,
    width: 100,
    sortable: false,
  },

  totalAfterTax: {
    description: 'description.total',
    label: 'label.total',
    key: 'totalAfterTax',
    width: 100,
    format: ColumnFormat.Currency,
    align: ColumnAlign.Right,
    sortable: false,
  },
  comment: {
    label: 'label.comment',
    key: 'comment',
    width: 250,
  },
  description: {
    label: 'heading.description',
    key: 'description',
    width: 250,
  },
  selection: getCheckboxSelectionColumn(),
  code: {
    label: 'label.code',
    key: 'code',
    width: 20,
  },
  packSize: {
    label: 'label.pack-size',
    key: 'packSize',
    width: 125,
    align: ColumnAlign.Right,
  },
  quantity: {
    description: 'description.pack-quantity',
    label: 'label.pack-quantity',
    key: 'quantity',
    width: 100,
    align: ColumnAlign.Right,
  },
  batch: {
    label: 'label.batch',
    key: 'batch',
    width: 100,
  },
  costPricePerPack: {
    label: 'label.cost',
    key: 'costPricePerPack',
    width: 50,
    align: ColumnAlign.Right,
    format: ColumnFormat.Currency,
  },
  sellPricePerPack: {
    label: 'label.sell',
    key: 'sellPricePerPack',
    width: 100,
    align: ColumnAlign.Right,
    format: ColumnFormat.Currency,
  },
  sellPricePerUnit: {
    label: 'label.unit-price',
    key: 'sellPricePerUnit',
    width: 100,
    align: ColumnAlign.Right,
    format: ColumnFormat.Currency,
  },
  locationName: {
    label: 'label.location',
    key: 'locationName',
    width: 75,
  },
  unitQuantity: {
    description: 'description.unit-quantity',
    label: 'label.unit-quantity',
    key: 'unitQuantity',
    width: 100,
    align: ColumnAlign.Right,
  },
  itemUnit: {
    label: 'label.unit',
    key: 'unit',
    width: 75,
  },
  lineTotal: {
    label: 'label.line-total',
    key: 'lineTotal',
    width: 100,
    align: ColumnAlign.Right,
    format: ColumnFormat.Currency,
  },
  requestedQuantity: {
    label: 'label.requested-quantity',
    description: 'description.requested-quantity',
    key: 'requestedQuantity',
    width: 100,
    align: ColumnAlign.Right,
  },
  supplyQuantity: {
    label: 'label.supply-quantity',
    description: 'description.supply-quantity',
    key: 'supplyQuantity',
    width: 100,
    align: ColumnAlign.Right,
  },
  stockOnHand: {
    label: 'label.stock-on-hand',
    key: 'availableStockOnHand',
    width: 100,
    align: ColumnAlign.Right,
  },
});

export class ColumnDefinitionSetBuilder<T extends RecordWithId> {
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
