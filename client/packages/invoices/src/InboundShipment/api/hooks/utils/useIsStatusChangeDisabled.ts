import { useInbound } from '../document/useInbound';
import { isInboundStatusChangeDisabled } from '../../../../utils';

export const useIsStatusChangeDisabled = (): boolean => {
  const { data } = useInbound();
  if (!data) return true;
  return isInboundStatusChangeDisabled(data);
};
