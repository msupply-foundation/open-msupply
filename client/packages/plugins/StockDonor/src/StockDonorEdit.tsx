import React from 'react';
import {
  BrowserRouter,
  PluginComponent,
  QueryClientProviderProxy,
  ThemeProviderProxy,
} from '@openmsupply-client/common';
import StockDonorEditInput from './StockDonorEditInput';
import { StockLineRowFragment } from '@openmsupply-client/system';

const StockDonorEdit: PluginComponent<StockLineRowFragment> = ({ data }) => (
  <ThemeProviderProxy>
    <QueryClientProviderProxy>
      <BrowserRouter>
        <StockDonorEditInput data={data} />
      </BrowserRouter>
    </QueryClientProviderProxy>
  </ThemeProviderProxy>
);

export default StockDonorEdit;
