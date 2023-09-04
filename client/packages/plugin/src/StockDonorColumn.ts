import { ColumnDefinition } from '@openmsupply-client/common';
import { StockLineRowFragment } from 'packages/system/src/Stock/api';

const StockDonorColumn = (): ColumnDefinition<StockLineRowFragment> => ({
  key: 'expiryDate',
  accessor: () => `Donor`,
  order: 1,
});

export default StockDonorColumn;
