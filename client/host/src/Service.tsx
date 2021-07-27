import * as React from 'react';

export const Context = React.createContext<ServiceContext>({
  setService: (service: Service) => {},
});

export interface Service {
  title: string;
}
export interface ServiceContext {
  setService: (service: Service) => void;
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

export const ServiceProvider: React.FC = props => {
  const value = useService();
  return <Context.Provider value={value}>{props.children}</Context.Provider>;
};
