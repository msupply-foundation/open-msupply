import React, { FC } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { LoadingApp } from '@openmsupply-client/common';
import TransactionService from './TransactionService';

const queryClient = new QueryClient();

const App: FC = () => (
  <QueryClientProvider client={queryClient}>
    <React.Suspense fallback={<LoadingApp />}>
      <TransactionService />
    </React.Suspense>
  </QueryClientProvider>
);

export default App;
