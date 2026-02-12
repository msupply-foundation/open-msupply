import { useInboundShipment } from '../document/useInboundShipment';
import { isInboundStatusChangeDisabled } from '../../../../utils';

export const useIsStatusChangeDisabled = (): boolean => {
  const {
    query: { data },
  } = useInboundShipment();
  if (!data) return true;
  return isInboundStatusChangeDisabled(data);
};
