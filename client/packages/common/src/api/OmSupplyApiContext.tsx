import React, { FC, useMemo, useEffect, useState, useCallback } from 'react';
import { createContext } from 'react';
import { GraphQLClient } from 'graphql-request';

export const createOmSupplyApi = (url: string): { client: GraphQLClient } => {
  const client = new GraphQLClient(url, { credentials: 'include' });
  return { client };
};

interface OmSupplyApiControl {
  client: GraphQLClient;
  setHeader: (header: string, value: string) => void;
  setUrl: (url: string) => void;
}

const OmSupplyApiContext = createContext<OmSupplyApiControl>({
  ...createOmSupplyApi(''),
  setHeader: () => {},
  setUrl: () => {},
});

const { Provider, Consumer } = OmSupplyApiContext;

interface ApiProviderProps {
  url: string;
}

export const OmSupplyApiProvider: FC<ApiProviderProps> = ({
  url,
  children,
}) => {
  const [{ client }, setApi] = useState<{
    client: GraphQLClient;
  }>(() => createOmSupplyApi(url));

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
    setApi(createOmSupplyApi(url));
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

export const OmSupplyApiConsumer = Consumer;

export const useOmSupplyApi = (): OmSupplyApiControl => {
  const omSupplyApiControl = React.useContext(OmSupplyApiContext);
  return omSupplyApiControl;
};
