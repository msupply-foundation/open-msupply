import React, { FC, PropsWithChildren } from 'react';
import { PropsWithChildrenOnly } from '@common/types';
import {
  QueryClient,
  QueryClientProvider as ReactQueryClientProvider,
} from 'react-query';
import { createRegisteredContext } from 'react-singleton-context';

const QueryClientContext = createRegisteredContext<{ client: QueryClient }>(
  'query-client',
  { client: {} as QueryClient }
);

export const QueryClientProvider: FC<
  PropsWithChildren<{ client: QueryClient }>
> = ({ client, children }) => {
  return (
    <QueryClientContext.Provider value={{ client }}>
      <QueryClientProviderProxy>{children}</QueryClientProviderProxy>
    </QueryClientContext.Provider>
  );
};

export const QueryClientProviderProxy: FC<PropsWithChildrenOnly> = ({
  children,
}) => {
  const { client } = React.useContext(QueryClientContext);

  return (
    <ReactQueryClientProvider client={client}>
      {children}
    </ReactQueryClientProvider>
  );
};
