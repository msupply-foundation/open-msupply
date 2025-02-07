import React from 'react';
import {
  ArrayElement,
  Plugins,
  QueryClientProviderProxy,
  ThemeProviderProxy,
} from '@openmsupply-client/common';
import StockDonorEditInput from './StockDonorEditInput';

export type StockDonorEditPlugin = NonNullable<
  ArrayElement<Plugins['stockEditForm']>
>;

const StockDonorEdit: StockDonorEditPlugin = ({ stockLine, events }) => (
  <ThemeProviderProxy>
    <QueryClientProviderProxy>
      <StockDonorEditInput stockLine={stockLine} events={events} />
    </QueryClientProviderProxy>
  </ThemeProviderProxy>
);

export default StockDonorEdit;
