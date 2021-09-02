import React, { FC } from 'react';
import { LoadingSpinner } from '@openmsupply-client/common';
import TransactionService from './Service';

const App: FC = () => (
  <React.Suspense fallback={<LoadingSpinner />}>
    <TransactionService />
  </React.Suspense>
);

export default App;
