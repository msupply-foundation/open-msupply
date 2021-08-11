import * as React from 'react';

export interface Service {
  title?: string;
}
export interface ServiceContext extends Service {
  setService: (service: Service) => void;
}

export const Context = React.createContext<ServiceContext>({
  setService: () => {},
  title: '',
});

const useService = () => {
  const [service, setService] = React.useState<Service>({
    title: '',
  });

  return {
    ...service,
    setService,
  };
};

export const useServiceContext = (): ServiceContext => {
  const context = React.useContext(Context);

  if (context === undefined) {
    throw new Error(
      'ServiceContext value is undefined. Make sure you use the ServiceProvider before using the context.'
    );
  }

  return context;
};

export const ServiceProvider: React.FC = ({ children }): JSX.Element => {
  const value = useService();
  return <Context.Provider value={value}>{children}</Context.Provider>;
};
