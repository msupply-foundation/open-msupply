import { isCustomerReturnDisabled } from '../../../../utils';
import { useCustomerReturn } from '../document/useCustomerReturn';

export const useCustomerReturnIsDisabled = (): boolean => {
  const { data } = useCustomerReturn();
  // When there's no customer return at all, this should mean we're in the process of creating a new return, so it shouldn't be disabled
  if (!data) return false;
  return isCustomerReturnDisabled(data);
};
