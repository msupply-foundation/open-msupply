import React, { useEffect, useState } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import { Autocomplete } from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { get as extractProperty } from 'lodash';

export const conditionalSelectTester = rankWith(
  10,
  uiTypeIs('ConditionalSelect')
);

type Options = {
  conditionField: string;
  conditionalValues: Record<string, string[]>;
};
const Options: z.ZodType<Options> = z
  .object({
    conditionField: z.string(),
    conditionalValues: z.record(z.array(z.string())),
  })
  .strict();

type DisplayOption = { label: string };

const UIComponent = (props: ControlProps) => {
  const { core } = useJsonForms();
  const { data, handleChange, label, path } = props;
  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    props.uischema.options
  );
  const [options, setOptions] = useState<DisplayOption[]>([]);
  const conditionField = extractProperty(
    core?.data ?? {},
    schemaOptions?.conditionField ?? ''
  );
  useEffect(() => {
    const currentOptions =
      schemaOptions?.conditionalValues[conditionField]?.map(it => ({
        label: it,
      })) ?? [];
    setOptions(currentOptions);
  }, [schemaOptions, conditionField]);

  if (!props.visible) {
    return null;
  }
  const onChange = (
    _event: React.SyntheticEvent,
    value: DisplayOption | null
  ) => handleChange(path, value?.label);
  const value = (data ? options.find(o => o.label === data) : undefined) ?? {
    label: '',
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      margin={0.5}
      marginLeft={0}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box flexBasis={FORM_INPUT_COLUMN_WIDTH}>
        <Autocomplete
          sx={{ '.MuiFormControl-root': { minWidth: '100%' } }}
          options={options}
          value={value}
          onChange={onChange}
          clearable={!props.config?.required}
          inputProps={{
            error: !!zErrors || !!props.errors,
            helperText: zErrors ?? props.errors,
          }}
          isOptionEqualToValue={option => option.label === data}
          disabled={!props.enabled}
        />
      </Box>
    </Box>
  );
};

export const ConditionalSelect = withJsonFormsControlProps(UIComponent);
