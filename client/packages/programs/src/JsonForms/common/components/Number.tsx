import React, { useState } from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  NumericTextInput,
  NumericTextInputProps,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH, DefaultFormRowSx } from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';

export const numberTester = rankWith(3, schemaTypeIs('number'));

const Options = z
  .object({
    inputAlignment: z.enum(['start', 'end']).optional(),
    paddingRight: z.number().optional(),
  })
  .optional();

type Options = z.infer<typeof Options>;

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, errors, schema, uischema } = props;
  const [localData, setLocalData] = useState<number | undefined>(data);
  const onChange = useDebounceCallback(
    (value: number | undefined) => handleChange(path, value),
    [path]
  );
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const error = !!errors || !!zErrors;

  if (!props.visible) {
    return null;
  }
  const inputProps: NumericTextInputProps & {
    onChange: (newValue: number) => void;
  } = {
    InputProps: {
      sx: { '& .MuiInput-input': { textAlign: 'right' } },
    },
    onChange: value => {
      setLocalData(value);
      onChange(value);
    },
    disabled: !props.enabled,
    error: error,
    helperText: errors,
    value: localData,
  };

  const inputAlignment = options?.inputAlignment ?? 'start';
  const paddingRight = options?.paddingRight ?? 0;

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={inputAlignment}
      inputSx={{ paddingRight: `${paddingRight}px` }}
      Input={
        <NumericTextInput
          {...inputProps}
          decimalLimit={10}
          min={schema.minimum}
          max={schema.maximum}
        />
      }
    />
  );
};

export const NumberField = withJsonFormsControlProps(UIComponent);
