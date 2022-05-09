import { useCallback } from 'react';
import { isA } from '../../../../utils';
import { InboundFragment } from '../../operations.generated';
import { useInboundSelector } from './index';

export const useInboundServiceLines = () => {
  const selectLines = useCallback((invoice: InboundFragment) => {
    return invoice.lines.nodes.filter(isA.serviceLine);
  }, []);

  return useInboundSelector(selectLines);
};
