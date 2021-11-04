import React, { FC, useEffect, useState } from 'react';
import { createContext } from 'react';
import { OmSupplyApi, createOmSupplyApi } from '.';

const Context = createContext<OmSupplyApi>(createOmSupplyApi(''));

const { Provider, Consumer } = Context;

interface ApiProviderProps {
  url: string;
}

export const OmSupplyApiProvider: FC<ApiProviderProps> = ({
  url,
  children,
}) => {
  const [api, setApi] = useState<OmSupplyApi>(() => createOmSupplyApi(url));

  useEffect(() => {
    setApi(createOmSupplyApi(url));
  }, [url]);

  return <Provider value={api}>{children}setApi</Provider>;
};

export const OmSupplyApiConsumer = Consumer;

export const useOmSupplyApi = (): OmSupplyApi => {
  const api = React.useContext(Context);
  return api;
};
