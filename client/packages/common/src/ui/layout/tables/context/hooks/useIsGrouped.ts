import { useCallback, useEffect } from 'react';
import { useLocalStorage, GroupByItem } from './../../../../../localStorage';
import { useTableStore, TableStore } from '../TableContext';

interface IsGroupedControl {
  isGrouped: boolean;
  toggleIsGrouped: () => void;
}

export const useIsGrouped = (key: keyof GroupByItem): IsGroupedControl => {
  const selector = useCallback(({ setIsGrouped }: TableStore) => {
    return { setIsGrouped };
  }, []);
  const { setIsGrouped } = useTableStore(selector);
  const [groupByItem, setGroupByItem] = useLocalStorage('/groupbyitem', {
    outboundShipment: false,
    inboundShipment: false,
    outboundReturn: false,
    inboundReturn: false,
    stocktake: true,
  });

  const toggleIsGrouped = useCallback(() => {
    const newVal = !groupByItem?.[key];
    setGroupByItem({ ...groupByItem, [key]: newVal });
  }, [groupByItem, key, setGroupByItem, setIsGrouped]);

  useEffect(() => {
    // Sync the table state up with the local storage state.
    // Syncing the states rather than explicitly setting in the callback
    // as we need to do this on the initial mount regardless.
    setIsGrouped(!!groupByItem?.[key]);
  }, [groupByItem?.[key]]);

  return { isGrouped: !!groupByItem?.[key], toggleIsGrouped };
};
