import React, { PropsWithChildren } from 'react';
import {
  BrowserRouter,
  QueryClientProviderProxy,
  ThemeProviderProxy,
} from '@openmsupply-client/common';
import StockDonorEditInput from './StockDonorEditInput';
import { StockLineRowFragment } from '@openmsupply-client/system';

export interface StockDonorEditProps {
  data: StockLineRowFragment;
}

const StockDonorEdit: React.FC<PropsWithChildren<StockDonorEditProps>> = ({
  data,
}) => (
  <ThemeProviderProxy>
    <QueryClientProviderProxy>
      <BrowserRouter>
        <StockDonorEditInput data={data} />
      </BrowserRouter>
    </QueryClientProviderProxy>
  </ThemeProviderProxy>
);

export default StockDonorEdit;
