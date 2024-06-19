import React, { useEffect, useState } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  Autocomplete,
  DetailInputWithLabelRow,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { extractProperty } from '@common/utils';

export const conditionalSelectTester = rankWith(
  10,
  uiTypeIs('ConditionalSelect')
);

const Options = z
  .object({
    conditionField: z.string(),
    /**
     * Maps record keys to a list of available selections.
     * The record key is compared to condition field value.
     */
    conditionalValues: z.record(z.array(z.string())),
  })
  .strict();
type Options = z.infer<typeof Options>;

type DisplayOption = { label: string };

/**
 * Operates on a string property (like a Text control) but allows to have predefined string options
 * depending on another Field.
 *
 * For example, if value of the field at `options.conditionField` is "Option1", the user can only
 * select values from `options.conditionalValues["Option1"]`.
 */

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
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <Autocomplete
          sx={{
            '.MuiFormControl-root': { minWidth: '100%' },
            flexBasis: '100%',
          }}
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
      }
    />
  );
};

export const ConditionalSelect = withJsonFormsControlProps(UIComponent);
