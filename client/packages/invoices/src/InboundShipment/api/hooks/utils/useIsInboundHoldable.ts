import { useInboundShipment } from '../document/useInboundShipment';
import { isInboundHoldable } from './../../../../utils';

export const useIsInboundHoldable = (): boolean => {
  const {
    query: { data },
  } = useInboundShipment();
  if (!data) return true;
  return isInboundHoldable(data);
};
