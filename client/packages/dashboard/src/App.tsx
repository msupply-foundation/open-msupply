import React from 'react';
import { LoadingApp, useLocalisationContext } from '@openmsupply-client/common';

const Host = React.lazy(() => import('host/Host'));

const App: React.FC = () => {
  console.info('******************** loading dashboard... *******************');

  const localisationContext = useLocalisationContext();
  localisationContext.addMessages({ 'app.admin': 'Admin' });
  return (
    <React.Suspense fallback={<LoadingApp />}>
      <Host />
    </React.Suspense>
  );
};
export default App;
