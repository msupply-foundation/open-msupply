import React, { FC } from 'react';
import { LoadingSpinner } from '@openmsupply-client/common';
import InvoiceService from './Service';

const App: FC = () => (
  <React.Suspense fallback={<LoadingSpinner />}>
    <InvoiceService />
  </React.Suspense>
);

export default App;
