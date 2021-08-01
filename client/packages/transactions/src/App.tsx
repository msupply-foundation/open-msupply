import React, { FC } from 'react';
import { LoadingApp } from '@openmsupply-client/common';

const App: FC = () => (
  <React.Suspense fallback={<LoadingApp />}>
    <span>Transactions</span>
  </React.Suspense>
);

export default App;
