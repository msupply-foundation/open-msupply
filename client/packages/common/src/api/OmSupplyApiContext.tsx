import React, { FC, useMemo, useEffect, useState, useCallback } from 'react';
import { createContext } from 'react';
import { GraphQLClient } from 'graphql-request';

export const createGraphQLClient = (url: string): { client: GraphQLClient } => {
  const client = new GraphQLClient(url, { credentials: 'include' });
  return { client };
};

interface GraphQLClientControl {
  client: GraphQLClient;
  setHeader: (header: string, value: string) => void;
  setUrl: (url: string) => void;
}

const GraphQLClientContext = createContext<GraphQLClientControl>({
  ...createGraphQLClient(''),
  setHeader: () => {},
  setUrl: () => {},
});

const { Provider } = GraphQLClientContext;

interface ApiProviderProps {
  url: string;
}

export const GraphQLClientProvider: FC<ApiProviderProps> = ({
  url,
  children,
}) => {
  const [{ client }, setApi] = useState<{
    client: GraphQLClient;
  }>(() => createGraphQLClient(url));

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
    setApi(createGraphQLClient(url));
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

export const useGraphQLClient = (): GraphQLClientControl => {
  const graphQLClientControl = React.useContext(GraphQLClientContext);
  return graphQLClientControl;
};
