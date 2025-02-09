import React from 'react';
import {
  QueryClientProviderProxy,
  ThemeProviderProxy,
} from '@openmsupply-client/common';
import { PropsWithChildrenOnly } from '@common/types';
import SyncStatusWidget from './SyncStatusWidget';

const SyncStatus: React.FC<PropsWithChildrenOnly> = () => (
  <ThemeProviderProxy>
    <QueryClientProviderProxy>
      <SyncStatusWidget />
    </QueryClientProviderProxy>
  </ThemeProviderProxy>
);

export default SyncStatus;
