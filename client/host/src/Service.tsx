import * as React from 'react';

export const Context = React.createContext<ServiceContext>({
  setService: (service: Service) => {},
  title: '',
});

export interface Service {
  title: string;
}
export interface ServiceContext {
  setService: (service: Service) => void;
  title: string;
}
const useService = () => {
  const [service, setService] = React.useState<Service>({ title: '' });

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

interface ServiceProviderProps {
  children?: JSX.Element | JSX.Element[];
}

export const ServiceProvider = ({
  children,
}: ServiceProviderProps): JSX.Element => {
  const value = useService();
  return <Context.Provider value={value}>{children}</Context.Provider>;
};
