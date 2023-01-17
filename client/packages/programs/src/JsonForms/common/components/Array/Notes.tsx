import React, { ComponentType, useState } from 'react';
import {
  rankWith,
  uiTypeIs,
  ArrayControlProps,
  ControlProps,
} from '@jsonforms/core';
import {
  withJsonFormsArrayControlProps,
  withJsonFormsControlProps,
} from '@jsonforms/react';
import { Typography } from '@mui/material';
import {
  useTranslation,
  useFormatDateTime,
  BasicTextInput,
  FlatButton,
  EditIcon,
} from '@openmsupply-client/common';
import { z } from 'zod';
import { useZodOptionsValidation } from '../../hooks/useZodOptionsValidation';

import { DateUtils } from '@common/intl';
import { JsonData } from '../../JsonForm';
import {
  CommonOptions,
  ArrayControlCustomProps,
  ArrayCommonComponent,
} from './';
import { useDebouncedTextInput } from '../../hooks/useDebouncedTextInput';

export const notesTester = rankWith(6, uiTypeIs('Notes'));

const NotesOptions = CommonOptions.extend({
  editRestrictions: z
    .object({
      /**
       * If true, only the newest note can be edited
       */
      latest: z.boolean().optional(),
      /**
       * If true, the element's data.authorId field must match the currently logged-in user (used for Notes)
       */
      isCurrentUser: z.boolean().optional(),
      /**
       * Number in days. Timestamp (data.created) must be less than this many
       * days in the past (used for Notes)
       */
      maxAge: z.number().optional(),
      // Add more as required
    })
    .optional(),
});

const NotesComponent = (props: ArrayControlCustomProps) => {
  const { enabled, data, config } = props;
  const { localisedDateTime } = useFormatDateTime();

  const options = props.uischema.options;

  const inputData = data ?? [];

  // This injects the required details info so that the children of "Notes" will
  // be "Note" components without having to specify it specifically in the
  // UISchema (since that would be redundant)
  if (!props.uischema.options) props.uischema.options = {};
  if (!props.uischema?.options?.['detail']) {
    props.uischema.options['detail'] = {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Note',
          scope: '/properties',
        },
      ],
    };
  }

  const getItemLabel = (_: JsonData, index: number, isExpanded: boolean) => {
    const {
      text = '',
      created,
      authorName,
    } = (inputData ? inputData[index] : {}) as {
      text?: string;
      created?: string;
      authorName?: string;
    };

    return (
      <div>
        {!isExpanded ? (
          <Typography
            sx={{
              textAlign: 'right',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 350,
            }}
          >
            {inputData && text}
            <br />
            <Typography
              component="span"
              sx={{
                textAlign: 'right',
                fontSize: '90%',
                color: 'gray.dark',
              }}
            >
              {created && `${authorName} (${localisedDateTime(created)})`}
            </Typography>
          </Typography>
        ) : null}
      </div>
    );
  };

  const isElementEditable = (child: any, index: number) => {
    if (!enabled) return false;
    if (!options?.['editRestrictions']) return true;

    const restrictions = options?.['editRestrictions'];

    // Must be editable if no timestamp (means it's just created)
    if (!child.created) return true;

    // Only allow the latest element to be edited
    if (restrictions?.latest && index !== inputData.length - 1) return false;

    // Author must match the current user
    if (
      restrictions?.isCurrentUser &&
      child?.authorId &&
      child.authorId !== config.user.id
    )
      return false;

    // Must not be older than `maxAge` days
    if (DateUtils.ageInDays(child.created) >= 1) return false;

    return true;
  };

  return (
    <ArrayCommonComponent
      {...props}
      isElementEditable={isElementEditable}
      getItemLabel={getItemLabel}
      zOptions={NotesOptions}
    />
  );
};

export const NotesControl = withJsonFormsArrayControlProps(
  NotesComponent as ComponentType<ArrayControlProps>
);

// NOTE component -- the child elements of the above NOTES array wrapper

const NoteOptions = z
  .object({
    width: z.string().optional(),
    /**
     * How many rows should the textbox display initially (default: 5)
     */
    rows: z.number().optional(),
  })
  .strict()
  .optional();

export const noteTester = rankWith(5, uiTypeIs('Note'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, path, errors, uischema, config, enabled } = props;
  const { localisedDateTime } = useFormatDateTime();
  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    NoteOptions,
    uischema.options
  );
  const error = !!errors || !!zErrors;
  const handleNoteChange = (text: string | undefined) => {
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
  };
  const { text, onChange } = useDebouncedTextInput(
    data,
    path,
    error,
    handleNoteChange
  );
  const [editMode, setEditMode] = useState(!text);

  const t = useTranslation('common');

  const helperText = zErrors ?? errors;

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

  const signature = data.created && (
    <Typography sx={authorStyle}>
      {`${data.authorName} (${localisedDateTime(data.created)})`}
    </Typography>
  );

  return editMode ? (
    <div>
      <BasicTextInput
        autoFocus
        fullWidth
        multiline
        rows={rows}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditMode(false)}
        onFocus={e => (e.target.selectionStart = text?.length ?? 0)}
        inputProps={{
          value: text ?? '',
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
      {signature}
    </div>
  ) : (
    <div>
      <Typography style={{ whiteSpace: 'pre-wrap' }}>{data.text}</Typography>
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
      {signature}
    </div>
  );
};

export const Note = withJsonFormsControlProps(UIComponent);
