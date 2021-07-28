import * as React from 'react';
export declare const Context: React.Context<ServiceContext>;
export interface Service {
    title: string;
}
export interface ServiceContext {
    setService: (service: Service) => void;
    title: string;
}
export declare const useServiceContext: () => ServiceContext;
interface ServiceProviderProps {
    children?: JSX.Element | JSX.Element[];
}
export declare const ServiceProvider: ({ children, }: ServiceProviderProps) => JSX.Element;
export {};
//# sourceMappingURL=Service.d.ts.map