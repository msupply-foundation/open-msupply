import React from 'react';
import {
  QueryClientProviderProxy,
  ThemeProviderProxy,
} from '@openmsupply-client/common';
import { PropsWithChildrenOnly } from '@common/types';
import ReplenishmentWidget from './ReplenishmentWidget';

const Replenishment: React.FC<PropsWithChildrenOnly> = () => (
  <ThemeProviderProxy>
    <QueryClientProviderProxy>
      <ReplenishmentWidget />
    </QueryClientProviderProxy>
  </ThemeProviderProxy>
);

export default Replenishment;
