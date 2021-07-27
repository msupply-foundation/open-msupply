declare module 'host/Host' {
  export default function (): JSX.Element;
}
declare module 'host/Service' {
  export function useServiceContext(): {
    setService: (service: Service) => void;
  };
}
