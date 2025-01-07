import { useInbound } from '../document/useInbound';
import { isInboundDisabled } from './../../../../utils';

export const useIsInboundDisabled = (): boolean => {
  const { data } = useInbound();
  if (!data) return true;
  return isInboundDisabled(data);
};
