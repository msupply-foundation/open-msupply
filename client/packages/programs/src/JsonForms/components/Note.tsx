import React, { useEffect, useMemo, useState } from 'react';
import { Actions, ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  useDebounceCallback,
  useTranslation,
  useAuthContext,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../common/styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../common/useZodOptionsValidation';

const Options = z
  .object({
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

export const noteTester = rankWith(5, uiTypeIs('Note'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, errors, uischema } = props;
  const [localText, setLocalText] = useState<string | undefined>(data?.text);
  const [author, setAuthor] = useState<string | undefined>(data?.authorId);
  // timestamp of the last key stroke
  const [latestKey, setLatestKey] = useState<number>(0);
  const { user } = useAuthContext();

  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const error = !!errors || !!zErrors;
  // debounce avoid rerendering the form on every key stroke which becomes a performance issue
  const onChange = useDebounceCallback(
    (value: string) => {
      console.log('Value', value);
      const authorId = user?.id;
      const created = new Date().toISOString();
      handleChange(
        path,
        error && value === '' ? undefined : { text: value, authorId, created }
      );
    },
    [path, error]
  );
  const t = useTranslation('common');

  console.log('data', data);
  console.log('user', user);

  const helperText = zErrors ?? errors;

  // const { core, dispatch } = useJsonForms();
  // useEffect(() => {
  //   if (!core || !dispatch) {
  //     return;
  //   }
  //   const currentErrors = core?.errors ?? [];
  // }, [core, dispatch]);

  useEffect(() => {
    // Using debounce, the actual data is set after 500ms after the last key
    // stroke (localDataTime). If data is set from the outside, e.g. through a
    // reset, we want to update our local data as well. To distinguish between
    // debounced events and external data updates we only take data that comes
    // in at least 500ms after the last key stroke, i.e. it must be set from the
    // outside.
    if (Date.now() > latestKey + 500) {
      setLocalText(data?.text);
    }
  }, [data]);

  if (!props.visible) {
    return null;
  }

  const width = schemaOptions?.width ?? '100%';
  const multiline = schemaOptions?.multiline !== false;
  const rows = schemaOptions?.rows ?? 5;

  return (
    <div>
      <DetailInputWithLabelRow
        label={label}
        inputProps={{
          value: localText ?? '',
          sx: { margin: 0.5, width },
          onChange: e => {
            setLatestKey(Date.now());
            setLocalText(e.target.value);
            onChange(e.target.value);
          },
          disabled: !props.enabled,
          error,
          helperText,
          FormHelperTextProps: error
            ? { sx: { color: 'error.main' } }
            : undefined,
          required: props.required,
          multiline,
          rows,
        }}
        labelWidthPercentage={FORM_LABEL_WIDTH}
        inputAlignment={'start'}
      />
      <p>Date and time</p>
      <p>Author</p>
    </div>
  );
};

export const Note = withJsonFormsControlProps(UIComponent);
