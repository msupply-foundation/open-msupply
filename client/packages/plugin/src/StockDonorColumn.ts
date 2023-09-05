import { ColumnDefinition } from '@openmsupply-client/common';
import { StockLineRowFragment } from 'packages/system/src/Stock/api';

const StockDonorColumn: ColumnDefinition<StockLineRowFragment> = {
  key: 'stock-donor',
  accessor: () => `Donor`,
  label: 'label.donor',
  sortable: false,
  order: 103,
};

export default StockDonorColumn;
