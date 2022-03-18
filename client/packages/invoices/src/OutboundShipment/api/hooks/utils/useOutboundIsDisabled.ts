import { useOutbound } from '../document/useOutbound';
import { isOutboundDisabled } from '../../../../utils';

export const useOutboundIsDisabled = (): boolean => {
  const { data } = useOutbound();
  if (!data) return true;
  return isOutboundDisabled(data);
};
