import {
  ColumnFormat,
  useColumns,
  useFormatDateTime,
} from '@openmsupply-client/common';
import { RepackFragment } from '../../api/operations.generated';

export const useLedgerColumns = () => {
  const { localisedTime } = useFormatDateTime();

  const columns = useColumns<RepackFragment>([
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
    },
    {
      key: 'reason',
      label: 'label.reason',
    },
  ]);

  return { columns };
};
