import React, { useEffect, useMemo, useState } from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  useTranslation,
} from '@openmsupply-client/common';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { useDebouncedTextInput } from '../hooks/useDebouncedTextInput';
import { FORM_LABEL_WIDTH, DefaultFormRowSx } from '../styleConstants';
import { useJSONFormsCustomError } from '../hooks/useJSONFormsCustomError';

const Options = z
  .object({
    /**
     * Additional pattern to be matched that can be defined in ui schema
     */
    pattern: z.string().optional(),
    /**
     * Make the text value mandatory in the UI.
     * For example, a field might be optional in the data schema but should be required in the UI.
     */
    required: z.boolean().optional(),
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

// Special error const for missing required value.
// We need a non-empty error message to mark the form as dirty but we don't want to display a
// "Required" helper text in the Text component.
const REQUIRED_ERROR = 'REQUIRED';

/** Validates the custom text options */
const useOptionsValidation = (
  path: string,
  isRequired: boolean,
  pattern?: RegExp,
  value?: string
): string | undefined => {
  const { customError, setCustomError } = useJSONFormsCustomError(path, 'Text');

  useEffect(() => {
    // required validation
    if (isRequired && !value) {
      setCustomError(REQUIRED_ERROR);
      return;
    }

    // pattern validation
    if (pattern && value !== undefined) {
      const result = pattern.exec(value);
      if (result == null) {
        setCustomError('Invalid format');
        return;
      }
    }
    setCustomError(undefined);
  }, [pattern, setCustomError, isRequired, value]);
  return customError;
};

export const stringTester = rankWith(3, schemaTypeIs('string'));

const UIComponent = (props: ControlProps) => {
  const { data, path, handleChange, errors, label } = props;
  const {
    errors: zErrors,
    options: schemaOptions,
    pattern,
  } = useOptions(props.uischema.options);
  const customErrors = useOptionsValidation(
    path,
    !!schemaOptions?.required,
    pattern,
    data
  );
  const { text, onChange } = useDebouncedTextInput(
    data,
    (value: string | undefined) => handleChange(path, value)
  );
  const t = useTranslation();

  const error = !!errors || !!zErrors || !!customErrors;

  const examples =
    schemaOptions?.examples ??
    (props.schema as Record<string, string[]>)['examples'];
  const helperText = (() => {
    if (!error) {
      return;
    }

    if (examples) {
      return t('error.json-bad-format-with-examples', {
        examples: examples.join('", "'),
      });
    }

    const text = zErrors ?? errors ?? customErrors;
    return text !== REQUIRED_ERROR ? text : undefined;
  })();

  if (!props.visible) {
    return null;
  }

  const multiline = schemaOptions?.multiline !== false;
  const rows = schemaOptions?.rows;

  const width = schemaOptions?.width ?? '100%';

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      inputProps={{
        value: text ?? '',
        sx: { width },
        style: { flexBasis: '100%' },
        onChange: e => onChange(e.target.value || ''),
        disabled: !props.enabled,
        error,
        helperText,
        FormHelperTextProps: error
          ? { sx: { color: 'error.main' } }
          : undefined,
        multiline,
        rows,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
    />
  );
};

export const TextField = withJsonFormsControlProps(UIComponent);
