import {
  ColumnFormat,
  SortBy,
  useColumns,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { LedgerRowFragment } from '../../api';

type MovementType =
  | 'INBOUND_SHIPMENT'
  | 'OUTBOUND_SHIPMENT'
  | 'INBOUND_RETURN'
  | 'OUTBOUND_RETURN'
  | 'PRESCRIPTION'
  | 'INVENTORY_ADDITION'
  | 'INVENTORY_REDUCTION';

export enum ColumnKey {
  'DateTime' = 'datetime',
  'Time' = 'time',
  'Name' = 'name',
  'Quantity' = 'quantity',
  'Type' = 'type',
  'Reason' = 'reason',
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
        sortable: true,
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
        sortable: true,
      },
      {
        key: ColumnKey.Quantity,
        label: 'label.quantity',
        sortable: true,
      },
      {
        key: ColumnKey.Type,
        label: 'label.type',
        accessor: ({ rowData }) =>
          t(getLocalisationKey(rowData.invoiceType as MovementType)),
        sortable: true,
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

const getLocalisationKey = (type: MovementType) => {
  switch (type) {
    case 'INBOUND_SHIPMENT':
      return 'inbound-shipment';
    case 'OUTBOUND_SHIPMENT':
      return 'outbound-shipment';
    case 'INBOUND_RETURN':
      return 'inbound-return';
    case 'OUTBOUND_RETURN':
      return 'outbound-return';
    case 'PRESCRIPTION':
      return 'prescription';
    case 'INVENTORY_ADDITION':
      return 'inventory-addition';
    case 'INVENTORY_REDUCTION':
      return 'inventory-reduction';
  }
};
