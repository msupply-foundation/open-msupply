import React, { useEffect, useState } from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  useDebounceCallback,
  // useTranslation,
  useFormatDateTime,
} from '@openmsupply-client/common';
import { Typography } from '@mui/material';
import { FORM_LABEL_WIDTH } from '../common/styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../common/useZodOptionsValidation';

// TO-DO:
// - "Required" errors
// - Options

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
  const { data, handleChange, path, errors, uischema, config, enabled } = props;
  const [localText, setLocalText] = useState<string | undefined>(data?.text);
  const [localAuthor, setLocalAuthor] = useState<string | undefined>(
    data?.authorName ??
      // TO-DO: Use full name for default once available in database
      config.user?.name
  );
  // timestamp of the last key stroke
  const [latestKey, setLatestKey] = useState<number>(0);
  const { localisedDateTime } = useFormatDateTime();

  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const error = !!errors || !!zErrors;

  const onChange = (
    text: string | undefined,
    authorName: string | undefined
  ) => {
    const authorId = config.user?.id;
    const created = data?.created ?? new Date().toISOString();
    handleChange(
      path,
      error
        ? undefined
        : {
            text,
            authorId,
            authorName,
            created,
          }
    );
  };

  // debounce avoid rerendering the form on every key stroke which becomes a performance issue
  const onChangeText = useDebounceCallback(
    (value: string) => value && onChange(value, localAuthor),
    [path, error, localAuthor]
  );

  const onChangeAuthor = useDebounceCallback(
    (value: string) => value && onChange(localText, value),
    [path, error, localText]
  );

  // const t = useTranslation('common');

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

  const authorStyle = {
    textAlign: 'right',
    fontSize: '90%',
    color: 'gray.dark',
  };

  return enabled ? (
    <div>
      <DetailInputWithLabelRow
        label="Text"
        inputProps={{
          value: localText ?? '',
          name: 'text',
          sx: { margin: 0.5, width },
          onChange: e => {
            setLatestKey(Date.now());
            setLocalText(e.target.value);
            onChangeText(e.target.value);
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
      <DetailInputWithLabelRow
        label={'Author'}
        inputProps={{
          value: localAuthor ?? '',
          name: 'author',
          sx: { margin: 0.5, width },
          onChange: e => {
            setLatestKey(Date.now());
            setLocalAuthor(e.target.value);
            onChangeAuthor(e.target.value);
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
        inputAlignment={'start'}
      />
      {data.created && (
        <Typography sx={authorStyle}>
          {localisedDateTime(data.created)}
        </Typography>
      )}
    </div>
  ) : (
    <div>
      <Typography>{data.text}</Typography>
      <Typography sx={authorStyle}>
        {`${data.authorName} (${localisedDateTime(data.created)})`}
      </Typography>
    </div>
  );
};

export const Note = withJsonFormsControlProps(UIComponent);
