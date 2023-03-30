import React from 'react';
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
  useProgramEnrolments,
  useProgramEvents,
} from '../../api';

import { z } from 'zod';

export const programEventTester = rankWith(10, uiTypeIs('ProgramEvent'));

const Options = z
  .object({
    documentType: z.string().optional(),
    eventType: z.string(),
    multiline: z.boolean().optional(),
    rows: z.number().optional(),
    /**
     * Display option based on type.
     */
    display: z
      .discriminatedUnion('type', [
        z.object({ type: z.literal('number') }),
        z.object({
          type: z.literal('string'),
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

const getDisplayOptions = (
  data: string | null | undefined,
  options?: Options
) => {
  let show =
    options?.display?.type === 'string' ? options?.display?.show : null;

  if (!show) {
    return data;
  }

  let displayValue = show.find(value => value[0] === data)?.[1];
  return displayValue ?? '';
};

const UIComponent = (props: ControlProps) => {
  const { label, uischema, data } = props;

  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const { data: programEnrolment } =
  useProgramEnrolments.document.programEnrolments({
      filterBy: {
          programEnrolmentId: {
              equalTo: data.programEnrolmentId,
            },
        },
    });
    
  const { data: events } = useProgramEvents.document.list(
    {
      patientId: programEnrolment?.nodes[0]?.patientId ?? '',
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
    },
    !!programEnrolment
  );
  const event = events?.nodes[0];

  const multiline = options?.multiline !== false;
  const rows = options?.rows;

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
