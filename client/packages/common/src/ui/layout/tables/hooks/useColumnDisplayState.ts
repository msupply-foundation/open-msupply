import { useMemo } from 'react';
import {
  useLocalStorage,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';
import { Column } from '../columns';
import { RecordWithId } from '@common/types';

export const useColumnDisplayState = <T extends RecordWithId>(
  tableId: string,
  initialColumns: Column<T>[]
) => {
  const [hiddenColsStorage, setHiddenColsStorage] =
    useLocalStorage('/columns/hidden');

  const simplifiedMobileView = useSimplifiedTabletUI();

  const hiddenColKeys =
    hiddenColsStorage?.[tableId] ??
    // If "Simplified Mobile View" is enabled, hide designated columns by
    // default, but only if no manual column hide/show statuses have already
    // been set.
    (simplifiedMobileView
      ? initialColumns
          .filter(col => col.defaultHideOnMobile)
          .map(col => col.key as string)
      : []);

  const columnDisplayState = useMemo(
    () =>
      Object.fromEntries([
        ...hiddenColKeys.map(colKey => [colKey, false]),
        ...initialColumns
          .filter(col => !hiddenColKeys.includes(String(col.key)))
          .map(col => [col.key, true]),
      ]),
    [hiddenColsStorage, initialColumns]
  );

  const toggleColumn = (colKey: string) => {
    const newHiddenColKeys =
      columnDisplayState[colKey] ||
      // If the column is not in the columnDisplayState (i.e. column appeared
      // after initial load as a plugin), we assume it to be "on", so we turn it
      // off here.
      columnDisplayState[colKey] === undefined
        ? [...hiddenColKeys, colKey]
        : hiddenColKeys.filter(key => key !== colKey);

    setHiddenColsStorage({
      ...hiddenColsStorage,
      [tableId]: newHiddenColKeys,
    });
  };

  const showAllColumns = () =>
    setHiddenColsStorage({
      ...hiddenColsStorage,
      [tableId]: [],
    });

  return { columnDisplayState, showAllColumns, toggleColumn };
};
