import React, { useEffect, useState } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps, useJsonForms } from '@jsonforms/react';
import {
  useDebounceCallback,
  DateUtils,
  NumericTextInput,
  useFormatDateTime,
  useTranslation,
  FormLabel,
  Box,
  DetailInputWithLabelRow,
} from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  useZodOptionsValidation,
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
} from '../common';
import { get as extractProperty } from 'lodash';
import { z } from 'zod';

const Options = z
  .object({
    /**
     * Expected quantity to be used per day.
     * If not specified it is set to one.
     */
    quantityPerDay: z.number().optional(),
    /**
     * Field name for the remaining quantity before dispensing.
     */
    remainingQuantityField: z.string().optional(),
    /**
     * Field name for the total quantity prescribed (remaining + )
     */
    quantityPrescribedField: z.string().optional(),
    /**
     * Absolute target field name where the end of supply date should be stored.
     * End of supply is calculated from the remainingQuantity + quantityDispensed where
     * quantityDispensed is entered in this control.
     */
    endOfSupplyField: z.string().optional(),
    /**
     * Absolute field name of a datetime value in the data. This field is used as the base datetime
     * to calculate the datetime when the patient runs out of medicine:
     * baseDatetime + daysDispensed.
     */
    baseDatetimeField: z.string(),

    totalQuantityLabel: z.string().optional(),
  })
  .strict();
type Options = z.infer<typeof Options>;

export const quantityDispensedTester = rankWith(
  10,
  uiTypeIs('QuantityDispensed')
);

const getEndOfSupply = (
  baseTime: string,
  remainingQuantity: number,
  quantityDispensed: number,
  options: Options | undefined
): Date => {
  const totalQuantity = remainingQuantity + quantityDispensed;
  return DateUtils.startOfDay(
    DateUtils.addDays(
      new Date(baseTime),
      totalQuantity * (options?.quantityPerDay ?? 1)
    )
  );
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema } = props;
  const [localData, setLocalData] = useState<number | undefined>(data);
  const [remainingQuantity, setRemainingQuantity] = useState(0);
  const [baseTime, setBaseTime] = useState<string | undefined>();
  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const dateFormat = useFormatDateTime();
  const t = useTranslation('programs');

  const { core } = useJsonForms();
  useEffect(() => {
    if (!core?.data) {
      return;
    }
    setBaseTime(extractProperty(core.data, options?.baseDatetimeField ?? ''));

    const remainingQuantity: number | undefined = extractProperty(
      core.data,
      options?.remainingQuantityField ?? ''
    );
    setRemainingQuantity(remainingQuantity ?? 0);
  }, [core?.data, options]);

  const onChange = useDebounceCallback(
    (value: number | undefined) => {
      // update events
      if (!options) {
        return;
      }
      if (baseTime === undefined) {
        throw Error('Unexpected error');
      }
      if (value === undefined) {
        handleChange(path, undefined);
        if (options.quantityPrescribedField)
          handleChange(options.quantityPrescribedField, undefined);
        if (options.endOfSupplyField)
          handleChange(options.endOfSupplyField, undefined);
        return;
      }

      handleChange(path, value);

      if (options.quantityPrescribedField) {
        handleChange(
          options.quantityPrescribedField,
          remainingQuantity + value
        );
      }
      if (options.endOfSupplyField) {
        const scheduleStartTime =
          value > 0
            ? getEndOfSupply(baseTime, remainingQuantity, value, options)
            : undefined;
        handleChange(
          options.endOfSupplyField,
          scheduleStartTime?.toISOString()
        );
      }
    },
    [path, options, baseTime]
  );
  const error = !!errors;

  const endOfSupplySec = baseTime
    ? getEndOfSupply(
        baseTime,
        remainingQuantity,
        localData ?? 0,
        options
      ).getTime() / 1000
    : undefined;

  if (!props.visible) {
    return null;
  }
  return (
    <>
      <DetailInputWithLabelRow
        sx={DefaultFormRowSx}
        label={label}
        labelWidthPercentage={FORM_LABEL_WIDTH}
        inputAlignment={'start'}
        Input={
          <NumericTextInput
            type="number"
            InputProps={{
              sx: { '& .MuiInput-input': { textAlign: 'right' } },
            }}
            onChange={value => {
              setLocalData(value);
              onChange(value);
            }}
            disabled={!props.enabled || baseTime === undefined}
            error={error}
            helperText={errors}
            value={localData}
          />
        }
      />
      <DetailInputWithLabelRow
        sx={DefaultFormRowSx}
        label={
          options?.totalQuantityLabel
            ? options?.totalQuantityLabel
            : t('label.total-quantity', { ns: 'programs' })
        }
        labelWidthPercentage={FORM_LABEL_WIDTH}
        inputAlignment={'start'}
        Input={
          <Box flexBasis="100%" display="flex" alignItems="center" gap={2}>
            <NumericTextInput
              type="number"
              InputProps={{
                sx: { '& .MuiInput-input': { textAlign: 'right' } },
              }}
              onChange={value => {
                if (value !== undefined) {
                  setLocalData(value);
                  onChange(value);
                }
              }}
              disabled={true}
              error={error}
              helperText={errors}
              value={remainingQuantity + (localData ?? 0)}
            />

            <Box
              flex={0}
              style={{ textAlign: 'end' }}
              flexBasis={FORM_LABEL_COLUMN_WIDTH}
            >
              <FormLabel sx={{ fontWeight: 'bold' }}>
                {t('label.end-of-supply')}:
              </FormLabel>
            </Box>
            <FormLabel>
              {endOfSupplySec
                ? `${dateFormat.localisedDate(endOfSupplySec)}`
                : ''}
            </FormLabel>
          </Box>
        }
      />
    </>
  );
};

export const QuantityPrescribed = withJsonFormsControlProps(UIComponent);
