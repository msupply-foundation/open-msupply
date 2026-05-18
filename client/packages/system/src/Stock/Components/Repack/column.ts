import { useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { RepackFragment } from '../../api/operations.generated';

export const useRepackColumns = () => {
  const t = useTranslation();
  const { localisedTime } = useFormatDateTime();

  const columns = useMemo(
    (): ColumnDef<RepackFragment>[] => [
      {
        accessorKey: 'datetime',
        header: t('label.date'),
        columnType: ColumnType.Date,
        size: 100,
      },
      {
        id: 'time',
        accessorFn: row => localisedTime(row.datetime),
        header: t('label.time'),
        size: 100,
      },
      {
        accessorKey: 'to.packSize',
        header: t('label.pack-size'),
        size: 100,
      },
      {
        accessorKey: 'to.numberOfPacks',
        header: t('label.num-packs'),
        size: 100,
      },
      {
        accessorKey: 'to.location?.name',
        header: t('label.location'),
        size: 150,
      },
    ],
    []
  );

  return columns;
};
