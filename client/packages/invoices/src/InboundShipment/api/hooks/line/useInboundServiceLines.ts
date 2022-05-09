import { useCallback } from 'react';
import { isA } from '../../../../utils';
import { InboundFragment } from '../../operations.generated';
import { useInboundSelector } from '../line/useInboundLines';

export const useInboundServiceLines = () => {
  const selectLines = useCallback((invoice: InboundFragment) => {
    return invoice.lines.nodes.filter(isA.serviceLine);
  }, []);

  return useInboundSelector(selectLines);
};
