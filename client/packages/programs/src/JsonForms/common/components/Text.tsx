import React from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  LocaleKey,
  useTranslation,
} from '@openmsupply-client/common';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { useDebouncedTextInput } from '../hooks/useDebouncedTextInput';
import { FORM_LABEL_WIDTH, DefaultFormRowSx } from '../styleConstants';
import { usePrevious } from '../hooks/usePrevious';
import { PreviousValueDisplay } from '../utilityComponents';

const Options = z
  .object({
    /**
     * Examples for the correct Regex pattern, which is defined in the Json
     * schema (not the uischema options)
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
    previousPath: z.string().optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

export const stringTester = rankWith(3, schemaTypeIs('string'));

const UIComponent = (props: ControlProps) => {
  const { data, path, handleChange, errors, label, uischema } = props;

  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const error = !!errors || !!zErrors;
  const onChange = (value: string | undefined) =>
    handleChange(path, !!value ? value : undefined);
  const { text, onChange: onDebounceChange } = useDebouncedTextInput(
    data,
    onChange
  );
  const t = useTranslation();

  const previousEncounterData = usePrevious(
    path,
    data,
    schemaOptions,
    onChange
  );

  const examples =
    (props.schema as Record<string, string[]>)['examples'] ??
    schemaOptions?.examples;
  const helperText =
    !!errors && examples && Array.isArray(examples)
      ? t('error.json-bad-format-with-examples', {
          examples: examples.join('", "'),
        })
      : zErrors || errors;

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
      {previousEncounterData && (
        <PreviousValueDisplay
          date={previousEncounterData.startDatetime}
          value={previousEncounterData.previousValue}
          label={label}
        />
      )}
    </>
  );
};

export const TextField = withJsonFormsControlProps(UIComponent);
