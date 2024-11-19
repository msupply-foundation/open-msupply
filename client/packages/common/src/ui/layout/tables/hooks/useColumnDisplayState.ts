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

  const [allIsSelected, setAllIsSelected] = useState(false)



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
    if(colKey === 'selection'){
      if(!allIsSelected){
        Object.keys(newState).forEach((key)=>newState[key] = true)
        setAllIsSelected(true)
      }else{
        Object.keys(newState).forEach((key)=>newState[key] = false)
        setAllIsSelected(false)
      }
      
    }
    setColumnDisplayState(newState);
    setHiddenColsStorage({
      ...hiddenColsStorage,
      [tableId]: Object.keys(newState).filter(key => !newState[key]),
    });
  };

  return { columnDisplayState, toggleColumn };
};
