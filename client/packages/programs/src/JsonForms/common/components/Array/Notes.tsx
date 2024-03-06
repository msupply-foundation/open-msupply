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
import {
  Typography,
  useTranslation,
  useFormatDateTime,
  BasicTextInput,
  FlatButton,
  EditIcon,
  ObjUtils,
} from '@openmsupply-client/common';
import { z } from 'zod';
import { useZodOptionsValidation } from '../../hooks/useZodOptionsValidation';

import { DateUtils } from '@common/intl';
import { JsonData, JsonFormsConfig } from '../../JsonForm';
import {
  CommonOptions,
  ArrayControlCustomProps,
  ArrayCommonComponent,
} from './';
import { useDebouncedTextInput } from '../../hooks/useDebouncedTextInput';
import { NoteSchema } from '../../../../schema_types';

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
  /**
   * How many rows should the textbox display initially (default: 5)
   */
  rows: z.number().optional(),
});

const NotesComponent = (props: ArrayControlCustomProps) => {
  const { enabled, data } = props;
  const config: JsonFormsConfig = props.config;
  const { localisedDateTime } = useFormatDateTime();

  const { options } = useZodOptionsValidation(
    NotesOptions,
    props.uischema.options
  );

  if (!options) return;

  const inputData = (data as NoteSchema[]) ?? [];

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
          options: {
            rows: props.uischema.options?.['rows'],
          },
        },
      ],
    };
  }

  const getItemLabel = (_: JsonData, index: number, isExpanded: boolean) => {
    const { text, created, authorName } = inputData[index] ?? { text: '' };

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
              {!!created && !!authorName
                ? `${authorName} (${localisedDateTime(created)})`
                : ''}
            </Typography>
          </Typography>
        ) : null}
      </div>
    );
  };

  const isElementEditable = (child: JsonData, index: number) => {
    if (!child || typeof child !== 'object' || Array.isArray(child))
      return false;
    if (!enabled) return false;
    if (!options.editRestrictions) return true;

    const restrictions = options?.['editRestrictions'];

    // Must be editable if no timestamp (means it's just created)
    const created = child['created'];
    if (!created || typeof created !== 'string') return true;

    // Only allow the latest element to be edited
    if (restrictions?.latest && index !== inputData.length - 1) return false;

    // Author must match the current user
    if (
      restrictions?.isCurrentUser &&
      child['authorId'] &&
      child['authorId'] !== config.user?.id
    )
      return false;

    // Must not be older than `maxAge` days
    if (
      DateUtils.ageInDays(created) >=
      (options?.editRestrictions?.maxAge ?? Infinity)
    )
      return false;

    return true;
  };

  return (
    <ArrayCommonComponent
      {...props}
      isElementEditable={isElementEditable}
      getItemLabel={getItemLabel}
      checkIsError={(child: JsonData) => {
        if (!child || !ObjUtils.isObject(child)) return false;
        return !!child?.['invalid'] && !child?.['text'];
      }}
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
    /**
     * How many rows should the textbox display initially (default: 5)
     */
    rows: z.number().optional(),
  })
  .strict()
  .optional();

export const noteTester = rankWith(5, uiTypeIs('Note'));

const NoteComponent = (props: ControlProps) => {
  const { handleChange, path, errors, uischema, config, enabled } = props;
  const noteData: NoteSchema | undefined = props.data;
  const { localisedDateTime } = useFormatDateTime();
  const { errors: zErrors, options } = useZodOptionsValidation(
    NoteOptions,
    uischema.options
  );
  const error = !!errors || !!zErrors;
  const handleNoteChange = (text: string | undefined) => {
    if (text === noteData?.text) return;

    const authorId = config.user?.id;
    // TO-DO: Use full name for Author name once available in database
    const authorName = config.user?.name;
    const created = noteData?.created ?? new Date().toISOString();

    handleChange(
      path,
      error
        ? undefined
        : ({
            text,
            authorId,
            authorName,
            created,
          } as NoteSchema)
    );
  };
  const { text, onChange } = useDebouncedTextInput(
    noteData?.text,
    handleNoteChange
  );
  const [editMode, setEditMode] = useState(!text);

  const t = useTranslation();

  if (!props.visible) {
    return null;
  }

  const rows = options?.rows ?? 5;

  const authorStyle = {
    textAlign: 'right',
    fontSize: '90%',
    color: 'gray.dark',
  };

  const signature = noteData?.created && (
    <Typography sx={authorStyle}>
      {`${noteData?.authorName} (${localisedDateTime(noteData?.created)})`}
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
        onBlur={() => {
          setEditMode(false);
          if (text === undefined || text === '')
            // Intentionally setting an invalid response so it can be
            // distinguished from a completely empty (also invalid) response for
            // the purposes of error checking
            handleChange(path, {
              text,
              invalid: true,
            });
        }}
        onFocus={e => (e.target.selectionStart = text?.length ?? 0)}
        inputProps={{
          value: text,
          name: 'text',
          sx: { margin: 0.5 },
          disabled: !props.enabled,
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
      <Typography style={{ whiteSpace: 'pre-wrap' }}>
        {noteData?.text}
      </Typography>
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

export const Note = withJsonFormsControlProps(NoteComponent);
