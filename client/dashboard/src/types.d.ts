declare module 'host/Host' {
  export default function (): JSX.Element;
}
declare module 'host/Service' {
  export function useServiceContext(): React.Context<{
    setService: (service: Service) => void;
  }>;
}
