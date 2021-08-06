import * as React from 'react';

export interface Service {
  locale?: string;
  title?: string;
}
export interface ServiceContext extends Service {
  setService: (service: Service) => void;
}

export const Context = React.createContext<ServiceContext>({
  locale: 'en',
  setService: () => {},
  title: '',
});

const useService = () => {
  const [service, setService] = React.useState<Service>({
    locale: 'en',
    title: '',
  });

  const updateService = (newService: Service) => {
    setService({...service, ...newService});
  }

  return {
    ...service,
    setService: updateService,
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
