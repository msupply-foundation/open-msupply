import { isInboundReturnDisabled } from '../../../../utils';
import { useInboundReturn } from '../document/useInboundReturn';

export const useInboundReturnIsDisabled = (): boolean => {
  const { data } = useInboundReturn();
  if (!data) return true;
  return isInboundReturnDisabled(data);
};
