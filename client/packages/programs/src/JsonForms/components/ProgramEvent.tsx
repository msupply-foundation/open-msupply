import React, { useEffect, useState } from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  NumericTextInput,
  noOtherVariants,
  useFormatDateTime,
} from '@openmsupply-client/common';
import {
  DefaultFormRowSpacing,
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
  JsonFormsConfig,
  useZodOptionsValidation,
} from '../common';
import {
  EncounterFragment,
  useEncounter,
  useProgramEnrolments,
  useProgramEvents,
} from '../../api';
import { extractProperty } from '@common/utils';
import { z } from 'zod';
import {
  ProgramEnrolmentFragment,
  ProgramEventFragment,
} from '../../api/operations.generated';

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
     * Specifies a field pointing to a patientId.
     * This patient id is then used to query for the program event.
     * If there is no data at patientIdField nothing is displayed.
     */
    patientIdField: z.string().optional(),
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
        z.object({
          /** Displays the event's activeStartDatetime */
          type: z.literal('eventActiveStartDatetime'),
          /** The date time format to display the datetime */
          format: z.string().optional(),
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
      case undefined: // fallthrough to the default 'before' value
      case 'before':
        const before = new Date(
          new Date(encounter?.startDatetime ?? date).getTime() - 1
        );
        return before;
      case 'after':
        return new Date(encounter?.startDatetime ?? date);
      default:
        noOtherVariants(options.at.encounterStartDatetime);
    }
  } else if (options?.at?.type === 'programEnrolment') {
    switch (options.at.programEnrolmentDatetime) {
      case undefined: // fallthrough to the default 'before' value
      case 'before':
        const before = new Date(
          new Date(program?.enrolmentDatetime ?? date).getTime() - 1
        );
        return before;
      case 'after':
        return new Date(program?.enrolmentDatetime ?? date);
      default:
        noOtherVariants(options.at.programEnrolmentDatetime);
    }
  }

  return date;
};

const useDisplayValue = (
  event: ProgramEventFragment | undefined,
  options?: Options
) => {
  const { customDate } = useFormatDateTime();
  if (!event) return '';

  if (options?.display?.type === 'eventActiveStartDatetime') {
    // 'P' is "Long localized date": https://date-fns.org/docs/format
    const format = options?.display.format ?? 'P';
    return customDate(new Date(event.activeStartDatetime), format);
  }

  const show =
    options?.display?.type === 'string' ? options?.display?.show : null;

  const data = event.data;
  if (!show) {
    return data;
  }

  const displayValue = show.find(value => value[0] === data)?.[1];
  return displayValue ?? '';
};

const UIComponent = (props: ControlProps) => {
  const { label, uischema } = props;
  const config: JsonFormsConfig = props.config;

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

  const { core } = useJsonForms();
  const patientId = options?.patientIdField
    ? extractProperty(core?.data, options.patientIdField, '') // use empty/invalid id if field is not set
    : config?.patientId;

  useEffect(() => {
    setDatetime(extractAt(encounter, program, options));
  }, [options, encounter, program]);

  const { data: events } = useProgramEvents.document.list({
    at: datetime ?? undefined,
    filter: {
      patientId: {
        equalTo: patientId,
      },
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
  const displayOption = useDisplayValue(event, options);

  if (!props.visible) {
    return null;
  }

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
          inputProps={{
            value: displayOption ?? '',
            disabled: true,
            sx: DefaultFormRowSpacing,
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
