import React from 'react';
import { rankWith, isEnumControl, ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import { Select } from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../useZodOptionsValidation';

export const selectTester = rankWith(4, isEnumControl);

type Options = {
  /**
   * Option to set a display name and/or reorder enum item.
   *
   * For example, enum [YES, NO] can be displayed as [No, Yes] using:
   * "show": [
   *   ["NO", "No"],
   *   ["YES", "Yes"]
   * ]
   *
   * To only reorder the enum to [NO, YES] do:
   * "show": [
   *   ["NO"],
   *   ["YES"]
   * ]
   */
  show?: [string, string | undefined][];
};
const Options: z.ZodType<Options | undefined> = z
  .object({
    show: z.array(z.tuple([z.string(), z.string().optional()])).optional(),
  })
  .strict()
  .optional();

type DisplayOption = { label: string; value: string };

const displayOptions = (
  schemaEnum: string[],
  options?: Options
): DisplayOption[] => {
  if (!options?.show) {
    return schemaEnum.map((option: string) => ({
      label: option,
      value: option,
    }));
  }

  return options.show.reduce<DisplayOption[]>((prev, [key, value]) => {
    if (!schemaEnum.includes(key)) {
      console.warn(
        `Invalid select control config: key ${key} is not in the enum`
      );
      return prev;
    }
    prev.push({ value: key, label: value ?? key });
    return prev;
  }, []);
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, schema, path } = props;
  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    props.uischema.options
  );
  if (!props.visible) {
    return null;
  }
  const options = schema.enum ? displayOptions(schema.enum, schemaOptions) : [];

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
      <Box flexBasis={FORM_INPUT_COLUMN_WIDTH}>
        <Select
          sx={{ minWidth: 100 }}
          options={options}
          value={data ?? ''}
          onChange={e => handleChange(path, e.target.value)}
          error={!!zErrors ?? !!props.errors}
          helperText={zErrors ?? props.errors}
        />
      </Box>
    </Box>
  );
};

export const Selector = withJsonFormsControlProps(UIComponent);
