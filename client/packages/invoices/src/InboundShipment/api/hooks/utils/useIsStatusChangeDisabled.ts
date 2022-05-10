import { useInbound } from '../document/useInbound';
import {
    useIsInboundStatusChangeDisabled,
  } from '../../../../utils';

export const useIsStatusChangeDisabled = (): boolean => {
  const { data } = useInbound();
  if (!data) return true;
  return useIsInboundStatusChangeDisabled(data);
};
