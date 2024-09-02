import {
  ColumnFormat,
  InvoiceNodeType,
  LocaleKey,
  SortBy,
  useColumns,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { LedgerRowFragment } from '../../api';

export enum ColumnKey {
  'DateTime' = 'datetime',
  'Time' = 'time',
  'Name' = 'name',
  'Quantity' = 'quantity',
  'Type' = 'type',
  'Reason' = 'reason',
  'Number' = 'number',
}

export const useLedgerColumns = (
  sortBy: SortBy<LedgerRowFragment>,
  updateSort: (sort: string, dir: 'asc' | 'desc') => void
) => {
  const t = useTranslation('app');
  const { localisedTime } = useFormatDateTime();

  const columns = useColumns<LedgerRowFragment>(
    [
      {
        key: ColumnKey.DateTime,
        label: 'label.date',
        format: ColumnFormat.Date,
        sortable: false,
      },
      {
        key: ColumnKey.Time,
        label: 'label.time',
        accessor: ({ rowData }) => localisedTime(rowData.datetime),
        sortable: false,
      },
      {
        key: ColumnKey.Name,
        label: 'label.name',
        sortable: false,
      },
      {
        key: ColumnKey.Quantity,
        label: 'label.quantity',
        sortable: false,
      },
      {
        key: ColumnKey.Number,
        label: 'label.number',
        accessor: ({ rowData }) => rowData.invoiceNumber,
        sortable: false,
      },
      {
        key: ColumnKey.Type,
        label: 'label.type',
        accessor: ({ rowData }) => t(getLocalisationKey(rowData.invoiceType)),
        sortable: false,
      },
      {
        key: ColumnKey.Reason,
        label: 'label.reason',
        sortable: false,
      },
    ],
    {
      sortBy,
      onChangeSortBy: sort => {
        updateSort(
          sort,
          sort === sortBy.key
            ? sortBy.direction === 'asc'
              ? 'desc'
              : 'asc'
            : 'desc'
        );
      },
    },
    [sortBy]
  );

  return { columns };
};

const getLocalisationKey = (type: InvoiceNodeType): LocaleKey => {
  switch (type) {
    case InvoiceNodeType.InboundShipment:
      return 'inbound-shipment';
    case InvoiceNodeType.OutboundShipment:
      return 'outbound-shipment';
    case InvoiceNodeType.CustomerReturn:
      return 'customer-return';
    case InvoiceNodeType.SupplierReturn:
      return 'supplier-return';
    case InvoiceNodeType.Prescription:
      return 'prescription';
    case InvoiceNodeType.InventoryAddition:
      return 'inventory-addition';
    case InvoiceNodeType.InventoryReduction:
      return 'inventory-reduction';
    case InvoiceNodeType.Repack:
      return 'label.repack';
  }
};
