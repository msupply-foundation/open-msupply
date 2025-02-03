import { ColumnDescription, useColumns } from '@openmsupply-client/common';
import { HistoryItem } from './HistoryModal';

export const useHistoryColumns = () => {
  const columns: ColumnDescription<HistoryItem>[] = [
    {
      label: 'label.qty-item-name',
      key: 'qtyItemName',
      accessor: ({ rowData }) => {
        const { unitQuantity, itemName } = rowData;
        return `${unitQuantity}, ${itemName}`;
      },
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
