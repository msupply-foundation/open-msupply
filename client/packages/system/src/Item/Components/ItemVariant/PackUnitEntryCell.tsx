import React, { ReactElement, useState } from 'react';
import {
  RecordWithId,
  CellProps,
  Select,
  PositiveNumberInput,
  useDebounceCallback,
  Box,
} from '@openmsupply-client/common';
import { useUnitVariant } from '../../context';

// This cell displays a packSize number input and unit pack drop down if unit pack variants exist
export const getPackUnitEntryCell =
  <T extends RecordWithId>({
    getItemId,
    getUnitName,
  }: {
    getItemId: (row: T) => string;
    getUnitName: (row: T) => string | null;
  }) =>
  ({ rowData, column }: CellProps<T>): ReactElement => {
    const { asPackUnit, variantsControl } = useUnitVariant(
      getItemId(rowData),
      getUnitName(rowData)
    );

    const [packSize, setPackSize] = useState(
      Number(column.accessor({ rowData }))
    );

    const updater = useDebounceCallback(column.setter, [column.setter], 250);

    // This is shared between input with drop down and without drop down
    const numberInput = (
      <PositiveNumberInput
        value={packSize}
        // Should PoaistiveNumberInput ever return undefined ?
        onChange={newValue => {
          setPackSize(newValue || 1);
          updater({ ...rowData, [column.key]: newValue });
        }}
      />
    );

    if (!variantsControl) {
      // If no variants exist, then default to just pack size entry
      return numberInput;
    }

    const { variants } = variantsControl;

    // Options should include manually entered option
    const extraOptions = variants.find(v => v.packSize === packSize)
      ? []
      : [{ label: asPackUnit(packSize), value: packSize }];

    return (
      <Box display="flex" flexDirection="row">
        {numberInput}
        <Select
          sx={{ flexGrow: 1 }}
          options={[
            ...extraOptions,
            ...variants.map(v => ({ label: v.shortName, value: v.packSize })),
          ]}
          value={packSize}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = Number(e.target.value);

            setPackSize(newValue);
            updater({ ...rowData, [column.key]: newValue });
          }}
        />
      </Box>
    );
  };
