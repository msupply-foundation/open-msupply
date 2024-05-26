import { useInbound } from '../document/useInbound';
import { isInboundHoldable } from './../../../../utils';

export const useIsInboundHoldable = (): boolean => {
  const { data } = useInbound();
  if (!data) return true;
  return isInboundHoldable(data);
};
