import { ColumnDef, useTranslation } from '@openmsupply-client/common';
import { HistoryItem } from './HistoryModal';
import { useMemo } from 'react';

export const useHistoryColumns = () => {
  const t = useTranslation();

  const columns = useMemo(
    (): ColumnDef<HistoryItem>[] => [
      {
        accessorKey: 'itemName',
        header: t('report.item-name'),
        size: 150,
      },
      {
        accessorKey: 'unitQuantity',
        header: t('label.unit-quantity'),
        size: 150,
      },
      {
        accessorKey: 'directions',
        header: t('label.directions'),
        size: 150,
      },
      {
        id: 'date',
        accessorFn: row => row.date?.toLocaleDateString(),
        header: t('label.date'),
        size: 150,
      },
      {
        accessorKey: 'prescriber',
        header: t('label.prescriber'),
        size: 150,
      },
    ],
    []
  );

  return columns;
};
