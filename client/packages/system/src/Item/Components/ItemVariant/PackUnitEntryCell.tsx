import React, { ReactElement, useState } from 'react';
import {
  RecordWithId,
  CellProps,
  Select,
  PositiveNumberInput,
  useDebounceCallback,
  Box,
  useTranslation,
  InnerBasicCell,
} from '@openmsupply-client/common';
import { useUnitVariant } from '../../context';

const ENTER_PACK_SIZE = -1;

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
    const { variantsControl } = useUnitVariant(
      getItemId(rowData),
      getUnitName(rowData)
    );
    const t = useTranslation();
    const [isEnterPackSize, setIsEnterPackSize] = useState(false);
    const [packSize, setPackSize] = useState(
      Number(column.accessor({ rowData }))
    );

    const updater = useDebounceCallback(column.setter, [column.setter], 250);

    // This is shared between input with drop down and without drop down
    const numberInput = () => {
      return (
        <PositiveNumberInput
          focusOnRender={isEnterPackSize}
          value={packSize}
          onChange={newValue => {
            setPackSize(newValue || 1);
            updater({ ...rowData, [column.key]: newValue });
          }}
        />
      );
    };

    if (!variantsControl) {
      // If no variants exist, then default to just pack size entry
      return numberInput();
    }

    const { variants } = variantsControl;

    const options = [
      ...variants.map(v => ({
        label: v.shortName,
        value: v.packSize,
      })),
      {
        label: t('label.enter-pack-size'),
        value: ENTER_PACK_SIZE,
      },
    ];

    return (
      <Box display="flex" flexDirection="row" alignItems="center">
        <Select
          sx={{ flexGrow: 1, marginLeft: '-2px' }}
          options={options}
          value={isEnterPackSize ? ENTER_PACK_SIZE : packSize}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = Number(e.target.value);

            // When manually entered pack size is selected, turn on manual entry
            // and set pack size to 1
            const isEnterPackSizeSelected = newValue === ENTER_PACK_SIZE;
            const newPackSize = isEnterPackSizeSelected ? 1 : newValue;

            setPackSize(newPackSize);
            setIsEnterPackSize(isEnterPackSizeSelected);
            updater({ ...rowData, [column.key]: newPackSize });
          }}
        />

        <InnerBasicCell value={'/'} />

        {
          /* Allo input only when manually entering pack size */
          isEnterPackSize ? (
            numberInput()
          ) : (
            <InnerBasicCell value={String(packSize)} />
          )
        }
      </Box>
    );
  };
