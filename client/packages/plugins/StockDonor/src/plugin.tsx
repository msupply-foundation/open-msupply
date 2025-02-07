import { Plugins } from '@openmsupply-client/common';
import StockDonorEdit from './StockDonorEdit';
import { StateLoader, StockDonorColumn } from './StockDonorColumn';

const StockDonor: Plugins = {
  stockEditForm: [StockDonorEdit],
  stockColumn: { StateLoader: [StateLoader], columns: [StockDonorColumn] },
};

export default StockDonor;
