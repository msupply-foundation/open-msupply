import * as React from 'react';

export const Context = React.createContext(undefined);

const useService = () => {
  const [service, setService] = React.useState({ title: '' });

  return {
    ...service,
    setService,
  };
};

export const useServiceContext = () => {
  const context = React.useContext(Context);

  if (context === undefined) {
    throw new Error(
      'ServiceContext value is undefined. Make sure you use the ServiceProvider before using the context.'
    );
  }

  return context;
};

export const ServiceProvider = (props) => {
  const value = useService();
  return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
