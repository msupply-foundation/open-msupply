import React, { FC } from 'react';
import { BasicSpinner } from '@openmsupply-client/common';
import InvoiceService from './Service';

const App: FC = () => (
  <React.Suspense fallback={<BasicSpinner />}>
    <InvoiceService />
  </React.Suspense>
);

export default App;
