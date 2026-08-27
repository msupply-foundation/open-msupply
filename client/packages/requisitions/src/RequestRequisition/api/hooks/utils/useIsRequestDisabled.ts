import { useRequest } from '../document/useRequest';
import { isRequestDisabled } from './../../../../utils';

export const useIsRequestDisabled = (): boolean => {
  const { data } = useRequest();
  if (!data) return true;
  // The other party's store may have been disabled (e.g. after a store merge);
  // such records remain viewable but must not be editable.
  if (data.otherParty?.store?.isDisabled) return true;
  return isRequestDisabled(data);
};
