import { isResponseDisabled } from './../../../../utils';
import { useResponse } from '../document/useResponse';

export const useIsResponseDisabled = (): boolean => {
  const { data } = useResponse();
  if (!data) return true;
  return isResponseDisabled(data);
};
