import React from 'react';
import { LoadingApp } from '@openmsupply-client/common';

const Host = React.lazy(() => import('host/Host'));

const App: React.FC = () => (
  <React.Suspense fallback={<LoadingApp />}>
    <Host />
  </React.Suspense>
);

export default App;
