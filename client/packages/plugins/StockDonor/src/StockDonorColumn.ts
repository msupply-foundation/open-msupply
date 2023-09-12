import { ColumnDefinition, StockLineNode } from '@openmsupply-client/common';

const StockDonorColumn: ColumnDefinition<StockLineNode> = {
  key: 'stock-donor',
  accessor: () => `Donor`,
  label: 'label.donor',
  sortable: false,
  order: 103,
};

export default StockDonorColumn;
