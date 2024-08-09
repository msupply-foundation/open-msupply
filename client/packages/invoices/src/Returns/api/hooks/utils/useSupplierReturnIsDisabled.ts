import { isOutboundDisabled } from '../../../../utils';
import { useSupplierReturn } from '../document/useSupplierReturn';

export const useSupplierReturnIsDisabled = (): boolean => {
  const { data } = useSupplierReturn();
  if (!data) return true;
  return isOutboundDisabled(data);
};
