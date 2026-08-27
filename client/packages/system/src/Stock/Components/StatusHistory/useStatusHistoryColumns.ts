import {
  ColumnDef,
  ColumnType,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { VvmStatusLogRowFragment } from '../../api';
import { useMemo } from 'react';

export const useStatusHistoryColumns = () => {
  const t = useTranslation();
  const { localisedTime } = useFormatDateTime();

  const columns = useMemo(
    (): ColumnDef<VvmStatusLogRowFragment>[] => [
      {
        id: 'date',
        accessorFn: row => row?.createdDatetime,
        header: t('label.date'),
        columnType: ColumnType.Date,
      },
      {
        id: 'time',
        accessorFn: row => localisedTime(row?.createdDatetime),
        header: t('label.time'),
      },
      {
        id: 'vvm-status',
        accessorFn: row => row?.status?.description,
        header: t('label.vvm-status'),
      },
      {
        id: 'level',
        accessorFn: row => row?.status?.priority,
        header: t('label.distribution-priority'),
      },
      {
        id: 'entered-by',
        accessorFn: row => {
          if (!row?.user) return '';
          const { firstName, lastName, username } = row.user;
          const enteredBy =
            firstName && lastName ? `${firstName} ${lastName}` : username;
          return enteredBy;
        },
        header: t('label.entered-by'),
      },
      {
        id: 'comment',
        accessorFn: row => row?.comment,
        header: t('label.comment'),
      },
    ],
    []
  );

  return columns;
};
