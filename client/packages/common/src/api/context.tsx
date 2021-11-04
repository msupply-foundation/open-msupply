import React, { FC, useEffect, useState } from 'react';
import { GraphQLClient } from 'graphql-request';
import { createContext } from 'react';
import { getSdk } from '..';

const Context = createContext<ReturnType<typeof getSdk>>(
  getSdk(new GraphQLClient(''))
);

const { Provider, Consumer } = Context;

interface ApiProviderProps {
  url: string;
}

export const OmsupplyApiProvider: FC<ApiProviderProps> = ({
  url,
  children,
}) => {
  const [api, setApi] = useState<ReturnType<typeof getSdk>>(() =>
    getSdk(new GraphQLClient(url))
  );

  useEffect(() => {
    setApi(getSdk(new GraphQLClient(url)));
  }, [url]);

  return <Provider value={api}>{children}setApi</Provider>;
};

export const OmsupplyApiConsumer = Consumer;

export const useOmsupplyApi = (): ReturnType<typeof getSdk> | null => {
  const api = React.useContext(Context);
  return api;
};
