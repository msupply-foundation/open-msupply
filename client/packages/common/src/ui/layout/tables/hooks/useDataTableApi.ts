import { TableInstance } from 'react-table';
import { DataTableApi } from './../types';
import { useImperativeHandle, useRef, RefObject } from 'react';

// eslint-disable-next-line @typescript-eslint/ban-types
export const useSetupDataTableApi = <DataTableRowType extends object>(
  ref: RefObject<DataTableApi<DataTableRowType>>,
  tableInstance: TableInstance<DataTableRowType>
): RefObject<DataTableApi<DataTableRowType>> => {
  const { selectedFlatRows, toggleAllRowsSelected, isAllRowsSelected } =
    tableInstance;

  useImperativeHandle(
    ref,
    () => ({
      // Mapping into a plain row object rather than a react-table row object
      // which contains a bunch of irrelevant data.
      selectedRows: selectedFlatRows.map(
        ({ values }) => values
      ) as DataTableRowType[],
      selectAllRows: toggleAllRowsSelected,
      deselectAllRows: () => toggleAllRowsSelected(false),
      toggleSelectAllRows: () => {
        const selectOrDeselect = isAllRowsSelected
          ? () => toggleAllRowsSelected(false)
          : toggleAllRowsSelected;

        selectOrDeselect();
      },
    }),
    [selectedFlatRows, isAllRowsSelected]
  );

  return ref;
};

export const useDataTableApi = <DataTableRowType>(): RefObject<
  DataTableApi<DataTableRowType>
> => {
  const tableApi = useRef<DataTableApi<DataTableRowType>>(null);
  return tableApi;
};
