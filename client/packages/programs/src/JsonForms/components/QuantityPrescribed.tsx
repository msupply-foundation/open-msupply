import React, { useEffect, useState } from 'react';
import {
  rankWith,
  ControlProps,
  uiTypeIs,
  composePaths,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import {
  useDebounceCallback,
  DateUtils,
  PositiveNumberInput,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
  useZodOptionsValidation,
} from '../common';
import { get as extractProperty } from 'lodash';
import { z } from 'zod';

type OptionEvent = {
  scheduleIn: {
    days?: number;
    minutes?: number;
  };
  documentType: string;
  name?: string;
  type: string;
};

type Options = {
  /**
   * Expected quantity to be used per day.
   * If not specified it is set to one.
   */
  quantityPerDay?: number;
  /** Field name of the target quantity prescribed field */
  quantityPrescribedField: string;
  /** Field name of the target end of supply field */
  endOfSupplyField: string;
  /**
   * Field name of a datetime value in the data. This field is used as the base datetime to
   * calculate the datetime when the patient runs out of medicine: baseDatetime + daysDispensed.
   */
  baseDatetimeField: string;
};

const OptionEvent: z.ZodType<OptionEvent> = z
  .object({
    scheduleIn: z.object({
      days: z.number().optional(),
      minutes: z.number().optional(),
    }),
    documentType: z.string(),
    name: z.string().optional(),
    type: z.string(),
  })
  .strict();

const Options: z.ZodType<Options> = z
  .object({
    quantityPerDay: z.number().optional(),
    quantityPrescribedField: z.string(),
    endOfSupplyField: z.string(),
    baseDatetimeField: z.string(),
  })
  .strict();

export const quantityPrescribedTester = rankWith(
  10,
  uiTypeIs('QuantityPrescribed')
);

const getEndOfSupply = (
  baseTime: string,
  pillCount: number,
  options: Options | undefined
): Date => {
  return DateUtils.startOfDay(
    DateUtils.addDays(
      new Date(baseTime),
      pillCount * (options?.quantityPerDay ?? 1)
    )
  );
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema } = props;
  const [localData, setLocalData] = useState<number | undefined>();
  const [baseTime, setBaseTime] = useState<string | undefined>();
  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const dateFormat = useFormatDateTime();
  const t = useTranslation('common');

  const onChange = useDebounceCallback(
    (value: number) => {
      // update events
      if (!options) {
        return;
      }
      if (baseTime === undefined) {
        throw Error('Unexpected error');
      }

      const fullPath = composePaths(path, options.quantityPrescribedField);
      handleChange(fullPath, value);

      const scheduleStartTime =
        value > 0 ? getEndOfSupply(baseTime, value, options) : undefined;
      handleChange(
        composePaths(path, options.endOfSupplyField),
        scheduleStartTime?.toISOString()
      );
    },
    [path, options, baseTime]
  );
  const error = !!errors;

  useEffect(() => {
    if (options) {
      setLocalData(
        extractProperty(data, options.quantityPrescribedField) ?? undefined
      );
    }
  }, [data, options]);
  useEffect(() => {
    setBaseTime(extractProperty(data, options?.baseDatetimeField ?? ''));
  }, [data, options]);

  const endOfSupplySec =
    baseTime && localData
      ? getEndOfSupply(baseTime, localData ?? 0, options).getTime() / 1000
      : undefined;

  if (!props.visible) {
    return null;
  }
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      marginTop={1}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box
        flexBasis={FORM_INPUT_COLUMN_WIDTH}
        display="flex"
        alignItems="center"
        gap={2}
      >
        <PositiveNumberInput
          min={0}
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
          value={localData ?? ''}
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
          {endOfSupplySec ? `${dateFormat.localisedDate(endOfSupplySec)}` : ''}
        </FormLabel>
      </Box>
    </Box>
  );
};

export const QuantityPrescribed = withJsonFormsControlProps(UIComponent);
