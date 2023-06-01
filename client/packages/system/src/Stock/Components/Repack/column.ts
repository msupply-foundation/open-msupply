import {
  ColumnFormat,
  useColumns,
  useFormatDateTime,
} from '@openmsupply-client/common';
import { RepackFragment } from '../../api/operations.generated';

export const useRepackColumns = () => {
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
      key: 'packSize',
      label: 'label.pack-size',
      accessor: ({ rowData }) => rowData?.to.packSize,
    },
    {
      key: 'numPacks',
      label: 'label.num-packs',
      accessor: ({ rowData }) => rowData?.to.numberOfPacks,
    },
    {
      key: 'location',
      label: 'label.location',
      accessor: ({ rowData }) => rowData?.to.location?.name,
    },
  ]);

  return { columns };
};
