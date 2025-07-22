import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  LocaleKey,
  useTranslation,
} from '@openmsupply-client/common';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { useDebouncedTextInput } from '../hooks/useDebouncedTextInput';
import { FORM_LABEL_WIDTH, DefaultFormRowSx } from '../styleConstants';
import { useJSONFormsCustomError } from '../hooks/useJSONFormsCustomError';
import { usePrevious } from '../hooks/usePrevious';

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
    flexBasis: z.string().optional(),
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
    /**
     * Should component debounce it's input, optional default = true
     */
    useDebounce: z.boolean().optional(),
    autoFocus: z.boolean().optional(),
    displayPrevious: z.boolean().optional(),
    defaultToPrevious: z.boolean().optional(),
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
  path: string,
  pattern?: RegExp,
  value?: string
): string | undefined => {
  const { customError, setCustomError } = useJSONFormsCustomError(path, 'Text');
  const lastValidatedValue = useRef<{ pattern?: string; value?: string }>({});

  useEffect(() => {
    // Skip validation if pattern or value hasn't actually changed
    const patternString = pattern?.toString();
    if (
      lastValidatedValue.current.pattern === patternString &&
      lastValidatedValue.current.value === value
    ) {
      return;
    }

    // Update last validated values
    lastValidatedValue.current = {
      pattern: patternString,
      value,
    };

    // Process validation
    if (!pattern || !value) {
      setCustomError(undefined);
      return;
    }

    const result = pattern.exec(value);
    if (result == null) {
      setCustomError('Invalid format');
    } else {
      setCustomError(undefined);
    }
  }, [pattern, setCustomError, value]);

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
  const customErrors = usePatternValidation(path, pattern, data);
  const error = !!errors || !!zErrors || !!customErrors;
  const onChange = (value: string | undefined) =>
    handleChange(path, !!value ? value : undefined);
  const { text, onChange: onDebounceChange } = useDebouncedTextInput(
    data,
    onChange
  );
  const t = useTranslation();

  const previousValue = usePrevious(path, data, schemaOptions ?? {}, onChange);

  console.log('Previous', previousValue);

  const examples =
    (props.schema as Record<string, string[]>)['examples'] ??
    schemaOptions?.examples;
  const helperText =
    (!!customErrors || !!errors) && examples && Array.isArray(examples)
      ? t('error.json-bad-format-with-examples', {
          examples: examples.join('", "'),
        })
      : (zErrors ?? errors ?? customErrors);

  if (!props.visible) {
    return null;
  }

  const multiline = schemaOptions?.multiline;
  const rows = schemaOptions?.rows;

  const width = schemaOptions?.width ?? '100%';
  const flexBasis = schemaOptions?.flexBasis ?? '100%';
  const useDebounce = schemaOptions?.useDebounce ?? true;
  const autoFocus = schemaOptions?.autoFocus ?? false;

  return (
    <>
      <DetailInputWithLabelRow
        sx={DefaultFormRowSx}
        label={t(label as LocaleKey)}
        inputProps={{
          value: text ?? '',
          sx: { width },
          style: { flexBasis },
          onChange: e =>
            useDebounce
              ? onDebounceChange(e.target.value ?? '')
              : onChange(e.target.value ?? ''),
          disabled: !props.enabled,
          error,
          helperText,
          FormHelperTextProps: error
            ? { sx: { color: 'error.main' } }
            : undefined,
          required: props.required,
          multiline,
          rows,
          focusOnRender: autoFocus,
        }}
        labelWidthPercentage={FORM_LABEL_WIDTH}
        inputAlignment={'start'}
      />
      {previousValue && <p>Previous value: {previousValue as string}</p>}
    </>
  );
};

export const TextField = withJsonFormsControlProps(UIComponent);
