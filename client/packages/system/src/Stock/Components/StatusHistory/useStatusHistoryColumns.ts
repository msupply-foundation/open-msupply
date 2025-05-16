import {
  ColumnFormat,
  useColumns,
  useFormatDateTime,
} from '@openmsupply-client/common';
import { VvmStatusLogRowFragment } from '../../api';

export const useStatusHistoryColumns = () => {
  const { localisedTime } = useFormatDateTime();

  const columns = useColumns<VvmStatusLogRowFragment>([
    {
      key: 'Date',
      label: 'label.date',
      accessor: ({ rowData }) => rowData?.createdDatetime,
      format: ColumnFormat.Date,
      sortable: false,
    },
    {
      key: 'time',
      label: 'label.time',
      accessor: ({ rowData }) => localisedTime(rowData?.createdDatetime),
      sortable: false,
    },
    {
      key: 'vvm-status',
      label: 'label.vvm-status',
      accessor: ({ rowData }) => rowData?.status?.code,
      sortable: false,
    },
    {
      key: 'entered-by',
      label: 'label.entered-by',
      accessor: ({ rowData }) =>
        `${rowData?.user?.firstName} ${rowData?.user?.lastName}`,
      sortable: false,
    },
    {
      key: 'comment',
      label: 'label.comment',
      accessor: ({ rowData }) => rowData?.comment,
      sortable: false,
    },
  ]);

  return { columns };
};
