import {
  ColumnDescription,
  useColumns,
} from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../../types';

export const useHistoryColumns = () => {
  const columns: ColumnDescription<DraftStockOutLine>[] = [
    {
      label: 'label.qty-item-name',
      key: 'qtyItemName',
      accessor: ({ rowData }) => {
        const {numberOfPacks, packSize,  itemName} = rowData;
        const unitQuantity = numberOfPacks*packSize
        return `${unitQuantity}, ${itemName}`
      },
      width: 80,
    },
    {
      label: 'label.directions',
      key: 'directions',
      width: 80,
      accessor: () => "todo",
    },
    {
      label: 'label.date',
      key: 'date',
      width: 50,
      accessor: () => "todo",
    },
    {
      label: 'label.prescriber',
      key: 'prescriber',
      width: 50,
      accessor: () => "todo",
    },

  ];

  return useColumns(columns, {}, []);
};
