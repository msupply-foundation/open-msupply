import { ColumnDescription, useColumns } from '@openmsupply-client/common';
import { HistoryItem } from './HistoryModal';

export const useHistoryColumns = () => {
  const columns: ColumnDescription<HistoryItem>[] = [
    {
      label: 'report.item-name',
      key: 'itemName',
    },
    {
      label: 'label.quantity',
      key: 'unitQuantity',
    },
    {
      label: 'label.directions',
      key: 'directions',
    },
    {
      label: 'label.date',
      key: 'date',
      accessor: ({ rowData }) => rowData.date?.toLocaleDateString(),
    },
    {
      label: 'label.prescriber',
      key: 'prescriber',
    },
  ];

  return useColumns(columns, {}, []);
};
