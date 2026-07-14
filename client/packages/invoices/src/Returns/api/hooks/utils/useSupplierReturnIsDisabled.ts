import { isOutboundDisabled } from '../../../../utils';
import { useSupplierReturn } from '../document/useSupplierReturn';

export const useSupplierReturnIsDisabled = (): boolean => {
  const { data } = useSupplierReturn();
  if (!data) return true;
  if (data.otherParty?.store?.isDisabled) return true;
  return isOutboundDisabled(data);
};
