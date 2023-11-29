import React from 'react';
import {
  BrowserRouter,
  QueryClientProviderProxy,
  ThemeProviderProxy,
} from '@openmsupply-client/common';
import { PropsWithChildrenOnly } from '@common/types';
import ReplenishmentWidget from './ReplenishmentWidget';

const Replenishment: React.FC<PropsWithChildrenOnly> = () => (
  <ThemeProviderProxy>
    <QueryClientProviderProxy>
      <BrowserRouter>
        <ReplenishmentWidget />
      </BrowserRouter>
    </QueryClientProviderProxy>
  </ThemeProviderProxy>
);

export default Replenishment;
