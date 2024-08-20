import { isCustomerReturnDisabled } from '../../../../utils';
import { useCustomerReturn } from '../document/useCustomerReturn';

export const useCustomerReturnIsDisabled = (): boolean => {
  const { data } = useCustomerReturn();
  if (!data) return true;
  return isCustomerReturnDisabled(data);
};
