import React, { FC, useEffect, useState, useCallback } from 'react';
import { createContext } from 'react';
import { OmSupplyApi, createOmSupplyApi } from '.';
import { GraphQLClient } from 'graphql-request';

interface OmSupplyApiControl {
  api: OmSupplyApi;
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
  const [{ client, api }, setApi] = useState<{
    client: GraphQLClient;
    api: OmSupplyApi;
  }>(() => createOmSupplyApi(url));

  const setUrl = useCallback((newUrl: string) => {
    client.setEndpoint(newUrl);
  }, []);

  const setHeader = useCallback((key: string, value: string) => {
    client.setHeader(key, value);
  }, []);

  useEffect(() => {
    setApi(createOmSupplyApi(url));
  }, [url]);

  return (
    <Provider value={{ api, client, setUrl, setHeader }}>
      {children}setApi
    </Provider>
  );
};

export const OmSupplyApiConsumer = Consumer;

export const useOmSupplyApi = (): OmSupplyApiControl => {
  const omSupplyApiControl = React.useContext(OmSupplyApiContext);
  return omSupplyApiControl;
};
