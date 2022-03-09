import React, { FC, useMemo, useEffect, useState, useCallback } from 'react';
import { createContext } from 'react';
import { GraphQLClient } from 'graphql-request';

export const createGql = (url: string): { client: GraphQLClient } => {
  const client = new GraphQLClient(url, { credentials: 'include' });
  return { client };
};

interface GqlControl {
  client: GraphQLClient;
  setHeader: (header: string, value: string) => void;
  setUrl: (url: string) => void;
}

const GqlContext = createContext<GqlControl>({
  ...createGql(''),
  setHeader: () => {},
  setUrl: () => {},
});

const { Provider } = GqlContext;

interface ApiProviderProps {
  url: string;
}

export const GqlProvider: FC<ApiProviderProps> = ({ url, children }) => {
  const [{ client }, setApi] = useState<{
    client: GraphQLClient;
  }>(() => createGql(url));

  const setUrl = useCallback(
    (newUrl: string) => {
      client.setEndpoint(newUrl);
    },
    [client]
  );

  const setHeader = useCallback(
    (key: string, value: string) => {
      client.setHeader(key, value);
    },
    [client]
  );

  useEffect(() => {
    setApi(createGql(url));
  }, [url]);

  const val = useMemo(
    () => ({
      client,
      setUrl,
      setHeader,
    }),
    [client, setUrl, setHeader]
  );

  return <Provider value={val}>{children}</Provider>;
};

export const useGql = (): GqlControl => {
  const graphQLClientControl = React.useContext(GqlContext);
  return graphQLClientControl;
};
