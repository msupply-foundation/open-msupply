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
  useEffect(() => {
    if (!schemaOptions?.freeText) {
      setLocalData(options.find(option => option.value === data));
    } else if (data) {
      setLocalData({ value: data, label: data });
    }
  }, [data, options, schemaOptions]);

  if (!props.visible) {
    return null;
  }

  // In free text mode we don't get an onChange update when changing focus; do an update manually
  const onClose = () => {
    if (!schemaOptions?.freeText) {
      return;
    }
    handleChange(path, localData);
  };

  const onInputChange = (_event: React.SyntheticEvent, value: string) => {
    if (schemaOptions?.freeText) {
      // set the local data so that we have it in onClose; don't set it otherwise because it would
      // affect the normal behaviour, i.e. the input wouldn't clear if the value is not valid
      setLocalData({ value, label: value });
    }
  };

  const onChange = (
    _event: React.SyntheticEvent,
    option: DisplayOption | null
  ) => {
    let s = '';
    if (typeof option === 'string') {
      // from freeText mode
      s = option;
    } else {
      s = option?.label ?? '';
    }
    if (
      !schemaOptions?.freeText &&
      !(schemaOptions?.show ?? []).some(([value, label]) =>
        label ? label === s : value === s
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
          value={localData ?? { value: '', label: '' }}
          // some type problem here, freeSolo seems to have type `undefined`
          freeSolo={schemaOptions?.freeText as undefined}
          onClose={onClose}
          onChange={onChange}
          onInputChange={onInputChange}
          clearable={!props.config?.required}
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
