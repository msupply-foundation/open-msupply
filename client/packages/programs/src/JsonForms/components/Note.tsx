import React, { useEffect, useState } from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  useDebounceCallback,
  useTranslation,
  useFormatDateTime,
  BasicTextInput,
  FlatButton,
  EditIcon,
} from '@openmsupply-client/common';
import { Typography } from '@mui/material';
import { z } from 'zod';
import { useZodOptionsValidation } from '../common/useZodOptionsValidation';

const Options = z
  .object({
    width: z.string().optional(),
    /**
     * How many rows should the textbox display initially (default: 5)
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
  // timestamp of the last key stroke
  const [latestKey, setLatestKey] = useState<number>(0);
  const [editMode, setEditMode] = useState(!localText);
  const { localisedDateTime } = useFormatDateTime();

  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const error = !!errors || !!zErrors;

  // debounce avoid rerendering the form on every key stroke which becomes a
  // performance issue
  const onChange = useDebounceCallback(
    (text: string | undefined) => {
      const authorId = config.user?.id;
      // TO-DO: Use full name for default once available in database
      const authorName = config.user?.name;
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
    },
    [path, error]
  );

  const t = useTranslation('common');

  const helperText = zErrors ?? errors;

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
  const rows = schemaOptions?.rows ?? 5;

  const authorStyle = {
    textAlign: 'right',
    fontSize: '90%',
    color: 'gray.dark',
  };

  return editMode ? (
    <div>
      <BasicTextInput
        autoFocus
        fullWidth
        multiline
        rows={rows}
        onChange={e => {
          setLatestKey(Date.now());
          setLocalText(e.target.value);
          onChange(e.target.value);
        }}
        onBlur={() => setEditMode(false)}
        onFocus={e => (e.target.selectionStart = localText?.length ?? 0)}
        inputProps={{
          value: localText ?? '',
          name: 'text',
          sx: { margin: 0.5, width },
          disabled: !props.enabled,
          error,
          helperText,
          FormHelperTextProps: error
            ? { sx: { color: 'error.main' } }
            : undefined,
          required: props.required,
          multiline: true,
          rows,
        }}
      />
      {data.created && (
        <Typography sx={authorStyle}>
          {`${data.authorName} (${localisedDateTime(data.created)})`}
        </Typography>
      )}
    </div>
  ) : (
    <div>
      <Typography>{data.text}</Typography>
      {enabled && (
        <div
          style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}
        >
          <FlatButton
            label={t('label.edit')}
            startIcon={<EditIcon style={{ fontSize: 16, fill: 'none' }} />}
            onClick={() => {
              setEditMode(true);
            }}
          />
        </div>
      )}
      <Typography sx={authorStyle}>
        {`${data.authorName} (${localisedDateTime(data.created)})`}
      </Typography>
    </div>
  );
};

export const Note = withJsonFormsControlProps(UIComponent);
