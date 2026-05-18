import { useMemo } from 'react';
import { useResponseFields } from '../document/useResponseFields';
import { useItemUtils } from '@openmsupply-client/common';

export const useResponseLines = () => {
  const { itemFilter, setItemFilter, matchItem } = useItemUtils();
  const { lines } = useResponseFields('lines');

  const filteredLines = useMemo(() => {
    return lines?.nodes.filter(item => matchItem(itemFilter, item.item));
  }, [lines, itemFilter]);

  return {
    lines: filteredLines ?? [],
    itemFilter,
    setItemFilter,
  };
};
