import { isOutboundDisabled } from '../../../../utils';
import { useOutboundReturn } from '../document/useOutboundReturn';

export const useOutboundReturnIsDisabled = (): boolean => {
  const { data } = useOutboundReturn();
  if (!data) return true;
  return isOutboundDisabled(data);
};
