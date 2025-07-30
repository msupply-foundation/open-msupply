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
      accessor: ({ rowData }) => rowData?.status?.description,
      sortable: false,
    },
    {
      key: 'level',
      label: 'label.level',
      accessor: ({ rowData }) => rowData?.status?.level,
    },
    {
      key: 'entered-by',
      label: 'label.entered-by',
      accessor: ({ rowData }) => {
        if (!rowData?.user) return '';
        const { firstName, lastName, username } = rowData.user;
        const enteredBy =
          firstName && lastName ? `${firstName} ${lastName}` : username;
        return enteredBy;
      },
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
