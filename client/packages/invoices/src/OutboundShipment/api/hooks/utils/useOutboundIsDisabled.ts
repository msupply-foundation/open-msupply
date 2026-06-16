import { useOutbound } from '../document/useOutbound';
import { isOutboundDisabled } from '../../../../utils';

export const useOutboundIsDisabled = (): boolean => {
  const { data } = useOutbound();
  if (!data) return true;
  // The other party's store may have been disabled (e.g. after a store merge);
  // such records remain viewable but must not be editable.
  if (data.otherParty?.store?.isDisabled) return true;
  return isOutboundDisabled(data);
};
