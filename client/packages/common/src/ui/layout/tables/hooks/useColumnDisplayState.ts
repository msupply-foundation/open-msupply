import { useState } from 'react';
import { useLocalStorage } from '@openmsupply-client/common';
import { Column } from '../columns';
import { RecordWithId } from '@common/types';

export const useColumnDisplayState = <T extends RecordWithId>(
  tableId: string,
  initialColumns: Column<T>[]
) => {
  const [hiddenColsStorage, setHiddenColsStorage] =
    useLocalStorage('/columns/hidden');
  const hiddenColKeys = hiddenColsStorage?.[tableId] ?? [];
  const [columnDisplayState, setColumnDisplayState] = useState<
    Record<string, boolean>
  >(
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

  return { columnDisplayState, toggleColumn };
};
