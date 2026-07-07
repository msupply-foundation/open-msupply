import { useOutbound } from '../document/useOutbound';
import { isOutboundDisabled } from '../../../../utils';

export const useOutboundIsDisabled = (): boolean => {
  const { data } = useOutbound();
  if (!data) return true;
  if (data.otherParty?.store?.isDisabled) return true;
  return isOutboundDisabled(data);
};
