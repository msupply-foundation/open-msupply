import { useCallback } from 'react';
import { useOutboundSelector } from '../document/useOutboundSelector';
import { isA } from '../../../../utils';
import { OutboundFragment } from '../../operations.generated';

export const useOutboundServiceLines = () => {
  const selectLines = useCallback((invoice: OutboundFragment) => {
    return invoice.lines.nodes.filter(isA.serviceLine);
  }, []);

  return useOutboundSelector(selectLines);
};
