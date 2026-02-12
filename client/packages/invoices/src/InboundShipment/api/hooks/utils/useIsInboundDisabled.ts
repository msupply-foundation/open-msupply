import { useInboundShipment } from '../document/useInboundShipment';
import { isInboundDisabled } from './../../../../utils';

export const useIsInboundDisabled = (): boolean => {
  const {
    query: { data },
  } = useInboundShipment();
  if (!data) return true;
  return isInboundDisabled(data);
};
