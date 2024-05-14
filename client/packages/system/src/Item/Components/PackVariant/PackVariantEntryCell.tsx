import React, { ReactElement, useEffect, useState } from 'react';
import {
  RecordWithId,
  CellProps,
  Select,
  NumericTextInput,
  useDebounceCallback,
  Box,
  useTranslation,
  BasicCellLayout,
  DEFAULT_NUMERIC_TEXT_INPUT_WIDTH,
} from '@openmsupply-client/common';
import { usePackVariant } from '../../context';

const ENTER_PACK_SIZE = -1;
export const PACK_VARIANT_ENTRY_CELL_MIN_WIDTH =
  150 + DEFAULT_NUMERIC_TEXT_INPUT_WIDTH;
// This cell displays a packSize number input and unit pack drop down if unit
// pack variants exist

export const PackVariantEntryCell =
  <T extends RecordWithId>({
    getItemId,
    getUnitName,
    getIsDisabled,
  }: {
    getItemId: (row: T) => string;
    getUnitName: (row: T) => string | null;
    getIsDisabled?: (row: T) => boolean;
  }) =>
  ({ rowData, column, isDisabled }: CellProps<T>): ReactElement => {
    const { variantsControl } = usePackVariant(
      getItemId(rowData),
      getUnitName(rowData)
    );
    const t = useTranslation();
    const [isEnterPackSize, setIsEnterPackSize] = useState(false);
    const [shouldFocusInput, setShouldFocusInput] = useState(false);
    const [packSize, setPackSize] = useState<number | undefined>(
      Number(column.accessor({ rowData }))
    );

    // If pack size is 0 on load set it to most used variant or 1 (ideally
    // should be default item pack). For stocklines this is possible since
    // server would set packSize to None when created from master list
    useEffect(() => {
      if (Number(column.accessor({ rowData })) == 0) {
        setPackSize(variantsControl?.activeVariant?.packSize || 1);
      }
    }, []);

    const updater = useDebounceCallback(column.setter, [column.setter], 250);
    const disabled = isDisabled || getIsDisabled?.(rowData) || false;

    // Make sure manual pack size is auto selected on load if packSize does not
    // match variant
    useEffect(() => {
      setIsEnterPackSize(
        !variantsControl?.variants.some(v => v.packSize === packSize)
      );
    }, []);

    // This is shared between input with drop down and without drop down
    const numberInput = () => {
      return (
        <NumericTextInput
          focusOnRender={shouldFocusInput}
          min={1}
          value={packSize}
          onChange={newValue => {
            // newValue could be undefined, while the user is inputting
            // (e.g. they clear the field to enter a new pack size)
            // In that case, we temporarily update the column value to 0 (so we don't have any `NaN`s)

            // NumericTextInput onBlur will reset the value to our min (1) if the field is empty!
            setPackSize(newValue);
            updater({ ...rowData, [column.key]: newValue || 0 });
          }}
          disabled={disabled}
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
        label: t('label.custom'),
        value: ENTER_PACK_SIZE,
      },
    ];
    return (
      <Box
        display="flex"
        flexDirection="row"
        alignItems="center"
        minWidth={PACK_VARIANT_ENTRY_CELL_MIN_WIDTH}
      >
        {/* reduce the chance that column changes size with minWidth */}
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
            setShouldFocusInput(isEnterPackSizeSelected);
            updater({ ...rowData, [column.key]: newPackSize });
          }}
          disabled={disabled}
        />

        <BasicCellLayout>{'/'}</BasicCellLayout>

        {
          /* Allow input only when manually entering pack size */
          isEnterPackSize ? (
            numberInput()
          ) : (
            /* reduce the chance that column changes size by matching width of input*/
            <BasicCellLayout width={DEFAULT_NUMERIC_TEXT_INPUT_WIDTH}>
              <div style={{ textAlign: 'start' }}>{String(packSize)}</div>
            </BasicCellLayout>
          )
        }
      </Box>
    );
  };
