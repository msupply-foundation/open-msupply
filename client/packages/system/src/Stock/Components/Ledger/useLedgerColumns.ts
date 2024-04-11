import {
  ColumnFormat,
  useColumns,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { LedgerLine } from '../../api/hooks/useStockLedger';

type MovementType =
  | 'INBOUND_SHIPMENT'
  | 'OUTBOUND_SHIPMENT'
  | 'INBOUND_RETURN'
  | 'OUTBOUND_RETURN'
  | 'PRESCRIPTION'
  | 'INVENTORY_ADDITION'
  | 'INVENTORY_REDUCTION';

export const useLedgerColumns = () => {
  const t = useTranslation('app');
  const { localisedTime } = useFormatDateTime();

  const columns = useColumns<LedgerLine>([
    {
      key: 'datetime',
      label: 'label.date',
      format: ColumnFormat.Date,
    },
    {
      key: 'time',
      label: 'label.time',
      accessor: ({ rowData }) => localisedTime(rowData.datetime),
    },
    {
      key: 'name',
      label: 'label.name',
    },
    {
      key: 'quantity',
      label: 'label.quantity',
    },
    {
      key: 'type',
      label: 'label.type',
      accessor: ({ rowData }) =>
        t(getLocalisationKey(rowData.type as MovementType)),
    },
    {
      key: 'reason',
      label: 'label.reason',
    },
  ]);

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
