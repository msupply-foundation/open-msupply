import { useState } from 'react';
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

  const simplifiedMobileView = true;

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

  // TO-DO Implement for column display...
  const simplifiedTabletView = useSimplifiedTabletUI();
  console.log('Mobile UI?', simplifiedTabletView);

  const [columnDisplayState, setColumnDisplayState] = useState<
    Record<string, boolean>
  >(
    // Builds an object with all the column keys as the properties and their
    // visible states as the values.
    // e.g. { name: true, itemCode: false, expiryDate: true... }
    Object.fromEntries([
      ...hiddenColKeys.map(colKey => [colKey, false]),
      ...initialColumns
        .filter(col => !hiddenColKeys.includes(String(col.key)))
        .map(col => [col.key, true]),
    ])
  );

  const toggleColumn = (colKey: string) => {
    const newState = {
      ...columnDisplayState,
      [colKey]:
        // If the column is not in the state object (i.e. column appeared after
        // initial load as a plugin), we assume it to be "on", so we turn it off
        // here.
        columnDisplayState[colKey] === undefined
          ? false
          : !columnDisplayState[colKey],
    };
    setColumnDisplayState(newState);
    setHiddenColsStorage({
      ...hiddenColsStorage,
      [tableId]: Object.keys(newState).filter(key => !newState[key]),
    });
  };

  const showAllColumns = () => {
    const newState = Object.fromEntries(
      Object.keys(columnDisplayState).map(key => [key, true])
    );

    setColumnDisplayState(newState);
    setHiddenColsStorage({
      ...hiddenColsStorage,
      [tableId]: Object.keys(newState).filter(key => !newState[key]),
    });
  };

  return { columnDisplayState, showAllColumns, toggleColumn };
};
