import React, { useEffect, useMemo, useState } from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  Autocomplete,
  Box,
  DetailInputWithLabelRow,
  useDebounceCallback,
  useTranslation,
} from '@openmsupply-client/common';
import {
  FORM_INPUT_COLUMN_WIDTH,
  FORM_LABEL_COLUMN_WIDTH,
  FORM_LABEL_WIDTH,
} from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../useZodOptionsValidation';
import { FormLabel } from '@mui/material';

type Options = {
  /**
   * Additional pattern to be matched that can be defined in ui schema
   */
  pattern?: string;
  /**
   * Examples for the correct pattern
   */
  examples?: string[];
  width?: string;
  allowedValues?: string[];
};
const Options: z.ZodType<Options | undefined> = z
  .object({
    pattern: z.string().optional(),
    examples: z.array(z.string()).optional(),
    width: z.string().optional(),
    allowedValues: z.array(z.string()).optional(),
  })
  .strict()
  .optional();

// Validates the option and parses the pattern into RegEx
const useOptions = (
  options?: Record<string, unknown>
): { errors?: string; options?: Options; pattern?: RegExp } => {
  const [regexError, setRegexErrors] = useState<string | undefined>();
  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    options
  );
  const pattern = useMemo(() => {
    if (!schemaOptions?.pattern) {
      return undefined;
    }
    try {
      return new RegExp(schemaOptions?.pattern);
    } catch {
      setRegexErrors(`Invalid regex: ${schemaOptions.pattern}`);
      return undefined;
    }
  }, [schemaOptions?.pattern]);

  return { errors: zErrors ?? regexError, options: schemaOptions, pattern };
};

// Returns error if value doesn't match the pattern
const usePatternValidation = (
  pattern?: RegExp,
  value?: string
): string | undefined => {
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!pattern || !value) {
      setError(undefined);
      return;
    }
    const result = pattern.exec(value);
    if (result == null) {
      setError('Invalid format');
    } else {
      setError(undefined);
    }
  }, [pattern, value]);
  return error;
};

export const stringTester = rankWith(3, schemaTypeIs('string'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, errors } = props;
  const [localData, setLocalData] = useState<string | undefined>(data);
  // timestamp of the last key stroke
  const [latestKey, setLatestKey] = useState<number>(0);
  const {
    errors: zErrors,
    options: schemaOptions,
    pattern,
  } = useOptions(props.uischema.options);
  const customErrors = usePatternValidation(pattern, localData);

  // if we are visible and enabled clear data if value is not allowed
  useEffect(() => {
    if (
      props.visible &&
      props.enabled &&
      localData &&
      schemaOptions?.allowedValues &&
      !schemaOptions?.allowedValues?.includes(localData)
    ) {
      setLocalData(undefined);
      handleChange(path, undefined);
      setLatestKey(Date.now());
    }
  }, [
    schemaOptions?.allowedValues,
    localData,
    props.visible,
    props.enabled,
    path,
  ]);

  const error = !!errors || !!zErrors || !!customErrors;
  // debounce avoid rerendering the form on every key stroke which becomes a performance issue
  const onChange = useDebounceCallback(
    (value: string) =>
      handleChange(path, error && value === '' ? undefined : value),
    [path, error]
  );
  const t = useTranslation('common');

  const examples =
    (props.schema as Record<string, string[]>)['examples'] ??
    schemaOptions?.examples;
  const helperText =
    (!!customErrors || !!errors) && examples && Array.isArray(examples)
      ? t('error.json-bad-format-with-examples', {
          examples: examples.join('", "'),
        })
      : zErrors ?? errors ?? customErrors;

  useEffect(() => {
    // Using debounce, the actual data is set after 500ms after the last key stroke (localDataTime).
    // If data is set from the outside, e.g. through a reset, we want to update our local data as
    // well.
    // To distinguish between debounced events and external data updates we only take data that
    // comes in at least 500ms after the last key stoke, i.e. it must be set from the outside.
    if (Date.now() > latestKey + 500) {
      setLocalData(data);
    }
  }, [data]);

  if (!props.visible) {
    return null;
  }

  if (schemaOptions?.allowedValues) {
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
          <Autocomplete
            sx={{ '.MuiFormControl-root': { minWidth: '135px' } }}
            options={schemaOptions?.allowedValues.map((option: string) => ({
              label: option,
              value: option,
            }))}
            value={
              localData
                ? {
                    label: localData,
                    value: localData,
                  }
                : undefined
            }
            disabled={!props.enabled}
            onChange={(_, v) => {
              setLocalData(v?.value);
              handleChange(path, v?.value);
            }}
            clearable={!props.config?.required}
            inputProps={{
              error: !!zErrors || !!props.errors,
              helperText: zErrors ?? props.errors,
            }}
            isOptionEqualToValue={option => option.value === data}
          />
        </Box>
      </Box>
    );
  }

  const width = schemaOptions?.width ?? '100%';
  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: localData ?? '',
        sx: { margin: 0.5, width },
        onChange: e => {
          setLatestKey(Date.now());
          setLocalData(e.target.value);
          onChange(e.target.value);
        },
        disabled: !props.enabled,
        error,
        helperText,
        FormHelperTextProps: error
          ? { sx: { color: 'error.main' } }
          : undefined,
        required: props.required,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
    />
  );
};

export const TextField = withJsonFormsControlProps(UIComponent);
