import React, { useEffect, useMemo, useState } from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  Autocomplete as AutocompleteCommon,
  DetailInputWithLabelRow,
} from '@openmsupply-client/common';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../styleConstants';

const Options = z
  .object({
    freeText: z.boolean().optional(),
    /**
     * Option to provide pre-defined values for the autocomplete and also to optionally show a
     * different value.
     *
     * For example, ["A", "Display option A"] would show as "Display option A" but record "A" in the
     * data object.
     */
    show: z.array(z.tuple([z.string()]).rest(z.string().optional())).optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

export const autocompleteTester = rankWith(10, uiTypeIs('Autocomplete'));

type DisplayOption = { label: string; value: string };

const getDisplayOptions = (options?: Options): DisplayOption[] => {
  if (!options?.show) return [];

  return options.show.reduce<DisplayOption[]>((prev, [key, value]) => {
    prev.push({ value: key, label: value ?? key });
    return prev;
  }, []);
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, errors } = props;
  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    props.uischema.options
  );

  const [localData, setLocalData] = useState<DisplayOption | undefined>();

  const options: DisplayOption[] = useMemo(
    () => getDisplayOptions(schemaOptions),
    [schemaOptions]
  );

  const clearable = !props.config?.required;

  useEffect(() => {
    if (!data && clearable) {
      setLocalData(undefined);
      return;
    }

    const matchingOption = options.find(option => option.value === data);
    if (matchingOption) {
      setLocalData(matchingOption);
    } else if (schemaOptions?.freeText) {
      setLocalData({ value: data, label: data });
    }
  }, [data, options, schemaOptions]);

  if (!props.visible) {
    return null;
  }

  const onInputChange = (_event: React.SyntheticEvent, value: string) => {
    if (schemaOptions?.freeText) {
      setLocalData({ value, label: value });
      handleChange(path, value);
    }
  };

  const onChange = (
    _event: React.SyntheticEvent,
    option: DisplayOption | null
  ) => {
    const inputString = option?.label ?? '';
    if (
      !schemaOptions?.freeText &&
      !(schemaOptions?.show ?? []).some(([value, label]) =>
        label ? label === inputString : value === inputString
      )
    ) {
      handleChange(path, undefined);
    } else {
      handleChange(path, option?.value ?? undefined);
    }
  };

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <AutocompleteCommon
          sx={{
            '.MuiFormControl-root': { minWidth: '100%' },
            flexBasis: '100%',
          }}
          options={options}
          value={localData ?? null}
          // some type problem here, freeSolo seems to have type `undefined`
          freeSolo={schemaOptions?.freeText as undefined}
          onChange={onChange}
          onInputChange={onInputChange}
          clearable={clearable}
          inputProps={{
            error: !!zErrors || !!errors,
            helperText: zErrors ?? errors,
            color: 'secondary',
          }}
          isOptionEqualToValue={(option, value) => {
            if (typeof value === 'string') {
              return option.label === value;
            }
            return option.label === value.label;
          }}
          disabled={!props.enabled}
        />
      }
    />
  );
};

export const Autocomplete = withJsonFormsControlProps(UIComponent);
