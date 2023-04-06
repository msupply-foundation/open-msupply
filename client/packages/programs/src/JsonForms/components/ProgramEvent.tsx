import React, { useEffect } from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  NumericTextInput,
} from '@openmsupply-client/common';
import {
  DefaultFormRowSpacing,
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../common';
import {
  useEncounter,
  useProgramEnrolments,
  useProgramEvents,
} from '../../api';

import { z } from 'zod';

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
    documentType: z.string(),
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

const extractAt = (datetime?: string, options?: Options): Date => {
  if (!datetime) {
    return new Date();
  }
  const beforeDate = new Date(new Date(datetime).getTime() - 1);
  if (!options || !options.at) {
    return beforeDate;
  }

  if (options.at.type === 'encounter') {
    switch (options.at.encounterStartDatetime) {
      case 'before':
        return beforeDate;
      case 'after':
        return new Date(datetime);
      default:
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ((_: never) => {})(options.at.encounterStartDatetime as never);
    }
  } else if (options.at.type === 'programEnrolment') {
    switch (options.at.programEnrolmentDatetime) {
      case 'before':
        return beforeDate;
      case 'after':
        return new Date(datetime);
      default:
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ((_: never) => {})(options.at.programEnrolmentDatetime as never);
    }
  }

  return new Date();
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
  const [datetime, setDatetime] = React.useState<string | undefined>();
  const patientId = config?.patientId;

  const { data: currentEncounter } = useEncounter.document.byDocName(
    config.documentName
  );
  const { data: programEnrolment } = useProgramEnrolments.document.byDocName(
    config.documentName
  );

  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  useEffect(() => {
    if (
      options?.at?.type === 'encounter' &&
      options?.at?.encounterStartDatetime
    ) {
      setDatetime(currentEncounter?.startDatetime);
    }

    if (
      options?.at?.type === 'programEnrolment' &&
      options?.at?.programEnrolmentDatetime
    ) {
      setDatetime(programEnrolment?.enrolmentDatetime);
    }
  }, [currentEncounter, programEnrolment]);

  const { data: events } = useProgramEvents.document.list({
    at: options?.at ? extractAt(datetime, options) : undefined,
    patientId: patientId ?? '',
    filter: {
      type: {
        equalTo: options?.eventType,
      },
      documentType: {
        equalTo: options?.documentType,
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
