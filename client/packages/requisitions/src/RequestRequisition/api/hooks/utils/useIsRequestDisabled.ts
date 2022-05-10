import { useRequest } from '../document/useRequest';
import { isRequestDisabled } from './../../../../utils';

export const useIsRequestDisabled = (): boolean => {
  const { data } = useRequest();
  if (!data) return true;
  return isRequestDisabled(data);
};
