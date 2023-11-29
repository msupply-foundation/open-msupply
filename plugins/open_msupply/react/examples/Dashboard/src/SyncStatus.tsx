import React from 'react';
import {
  BrowserRouter,
  QueryClientProviderProxy,
  ThemeProviderProxy,
} from '@openmsupply-client/common';
import { PropsWithChildrenOnly } from '@common/types';
import SyncStatusWidget from './SyncStatusWidget';

const SyncStatus: React.FC<PropsWithChildrenOnly> = () => (
  <ThemeProviderProxy>
    <QueryClientProviderProxy>
      <BrowserRouter>
        <SyncStatusWidget />
      </BrowserRouter>
    </QueryClientProviderProxy>
  </ThemeProviderProxy>
);

export default SyncStatus;
