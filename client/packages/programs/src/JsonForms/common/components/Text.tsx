import React, { useEffect, useMemo, useState } from 'react';
import { Actions, ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { Box, FormLabel, useTranslation } from '@openmsupply-client/common';
import { z } from 'zod';
import { useZodOptionsValidation } from '../useZodOptionsValidation';
import { DebouncedTextInput } from './DebouncedTextInput';
import { FORM_LABEL_WIDTH } from '../styleConstants';

const Options = z
  .object({
    /**
     * Additional pattern to be matched that can be defined in ui schema
     */
    pattern: z.string().optional(),
    /**
     * Examples for the correct pattern
     */
    examples: z.array(z.string()).optional(),
    width: z.string().optional(),
    /**
     * If true, text input will expand to multiple lines if required (default:
     * true)
     */
    multiline: z.boolean().optional(),
    /**
     * How many rows should the textbox display initially (default: 1, ignored
     * if `multiline === false`)
     */
    rows: z.number().optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

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
  const { data, path, handleChange, errors, label } = props;
  const {
    errors: zErrors,
    options: schemaOptions,
    pattern,
  } = useOptions(props.uischema.options);
  const customErrors = usePatternValidation(pattern, data);

  const error = !!errors || !!zErrors || !!customErrors;
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

  const { core, dispatch } = useJsonForms();
  useEffect(() => {
    if (!core || !dispatch) {
      return;
    }
    const currentErrors = core?.errors ?? [];
    if (customErrors) {
      dispatch(
        Actions.updateErrors([
          ...currentErrors,
          {
            instancePath: path,
            message: customErrors,
            schemaPath: path,
            keyword: '',
            params: {},
          },
        ])
      );
    }
  }, [core, dispatch, customErrors]);

  if (!props.visible) {
    return null;
  }

  const multiline = schemaOptions?.multiline !== false;
  const rows = schemaOptions?.rows;

  const width = schemaOptions?.width ?? '100%';
  const labelFlexBasis = `${FORM_LABEL_WIDTH}%`;
  const inputFlexBasis = `${100 - FORM_LABEL_WIDTH}%`;
  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Box style={{ textAlign: 'end' }} flexBasis={labelFlexBasis}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box
        flexBasis={inputFlexBasis}
        justifyContent={'flex-start'}
        display="flex"
      >
        <DebouncedTextInput
          data={data}
          onChange={value => handleChange(path, value)}
          inputProps={{
            sx: { margin: 0.5, width },
            disabled: !props.enabled,

            FormHelperTextProps: error
              ? { sx: { color: 'error.main' } }
              : undefined,
            required: props.required,
            multiline,
            rows,
            error,
            helperText,
          }}
        />
      </Box>
    </Box>
  );
};

export const TextField = withJsonFormsControlProps(UIComponent);
