import React, { useEffect, useState } from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  NumericTextInput,
} from '@openmsupply-client/common';
import {
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../common';
import {
  EncounterFragment,
  useEncounter,
  useProgramEnrolments,
  useProgramEvents,
} from '../../api';

import { z } from 'zod';
import { ProgramEnrolmentFragment } from '../../api/operations.generated';

export const programEventTester = rankWith(10, uiTypeIs('ProgramEvent'));

/**
 * This control displays program events based on the program type and event.
 */
const Options = z
  .object({
    /**
     * The time when the event should be triggered.
     * Time of the event:
     * `before`: just before the current encounter
     * `after`: at and after the start of the current encounter
     * Default: `before`
     */
    at: z
      .discriminatedUnion('type', [
        z.object({
          type: z.literal('encounter'),
          encounterStartDatetime: z.enum(['before', 'after']).optional(),
        }),
        z.object({
          type: z.literal('programEnrolment'),
          programEnrolmentDatetime: z.enum(['before', 'after']).optional(),
        }),
      ])
      .optional(),
    /** Show a program events that target documents of a certain type.
     * Note, this only includes events that are not targeting a specific document name.
     * If not specified the program events for the current document are displayed
     * (using the document name of the current JSONForms document)
     */
    documentType: z.string().optional(),
    eventType: z.string(),
    /**
     * Display option based on type.
     */
    display: z
      .discriminatedUnion('type', [
        z.object({ type: z.literal('number') }),
        z.object({
          type: z.literal('string'),
          multiline: z.boolean().optional(),
          rows: z.number().optional(),
          show: z.array(
            z
              .tuple([z.string(), z.string().optional()])
              .rest(z.string().optional())
          ),
        }),
      ])
      .optional(),
  })
  .strict();
type Options = z.infer<typeof Options>;

const extractAt = (
  encounter?: EncounterFragment,
  program?: ProgramEnrolmentFragment,
  options?: Options
): Date => {
  const date = new Date();

  if (options?.at?.type === 'encounter') {
    switch (options.at.encounterStartDatetime) {
      case 'before':
        const before = new Date(
          new Date(encounter?.startDatetime ?? date).getTime() - 1
        );
        return before;
      case 'after':
        return new Date(encounter?.startDatetime ?? date);
      default:
        ((_: never) => {})(options.at.encounterStartDatetime as never);
    }
  } else if (options?.at?.type === 'programEnrolment') {
    switch (options.at.programEnrolmentDatetime) {
      case 'before':
        const before = new Date(
          new Date(program?.enrolmentDatetime ?? date).getTime() - 1
        );
        return before;
      case 'after':
        return new Date(program?.enrolmentDatetime ?? date);
      default:
        ((_: never) => {})(options.at.programEnrolmentDatetime as never);
    }
  }

  return date;
};

const getDisplayOptions = (
  data: string | null | undefined,
  options?: Options
) => {
  const show =
    options?.display?.type === 'string' ? options?.display?.show : null;

  if (!show) {
    return data;
  }

  const displayValue = show.find(value => value[0] === data)?.[1];
  return displayValue ?? '';
};

const UIComponent = (props: ControlProps) => {
  const { label, uischema, config } = props;
  const patientId = config?.patientId;
  const [datetime, setDatetime] = useState<Date | undefined>();

  const { data: encounter } = useEncounter.document.byDocName(
    config.documentName
  );
  const { data: program } = useProgramEnrolments.document.byDocName(
    config.documentName
  );

  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  useEffect(() => {
    setDatetime(extractAt(encounter, program, options));
  }, [options?.at, encounter, program]);

  const { data: events } = useProgramEvents.document.list({
    at: datetime ?? undefined,
    patientId: patientId ?? '',
    filter: {
      type: {
        equalTo: options?.eventType,
      },
      documentType: {
        equalTo: options?.documentType
          ? options.documentType
          : encounter?.document?.documentRegistry?.documentType,
      },
    },
    page: {
      first: 1,
    },
  });

  const event = events?.nodes[0];

  const multiline =
    options?.display?.type === 'string' ? options?.display?.multiline : false;
  const rows = options?.display?.type === 'string' ? options?.display?.rows : 1;

  if (!props.visible) {
    return null;
  }

  const displayOption = getDisplayOptions(event?.data, options);

  return (
    <>
      {options?.display?.type && options?.display.type === 'number' ? (
        <DetailInputWithLabelRow
          label={label}
          sx={{
            ...DefaultFormRowSx,
            minWidth: '300px',
            justifyContent: 'space-around',
          }}
          labelWidthPercentage={FORM_LABEL_WIDTH}
          inputAlignment="start"
          Input={
            <NumericTextInput
              disabled={true}
              inputProps={{
                value: event?.data ?? '',
                error: !!errors,
                helperText: errors,
              }}
            />
          }
        />
      ) : (
        <DetailInputWithLabelRow
          label={label}
          sx={DefaultFormRowSx}
          inputProps={{
            value: displayOption ?? '',
            disabled: true,
            sx: { width: '100%' },
            style: { flexBasis: '100%' },
            error: !!errors,
            helperText: errors,
            multiline,
            rows,
          }}
          labelWidthPercentage={FORM_LABEL_WIDTH}
          inputAlignment={'start'}
        />
      )}
    </>
  );
};

export const ProgramEvent = withJsonFormsControlProps(UIComponent);
