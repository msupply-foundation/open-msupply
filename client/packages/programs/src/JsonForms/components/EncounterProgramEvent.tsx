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
import { EncounterFragment, useEncounter, useProgramEvents } from '../../api';

import { z } from 'zod';

export const encounterProgramEventTester = rankWith(
  10,
  uiTypeIs('EncounterProgramEvent')
);

const Options = z
  .object({
    /**
     * Time of the program event:
     * `before`: just before the current encounter
     * `start`: at the start of the current encounter
     * Default: `before`
     */
    at: z.enum(['before', 'start']).optional(),
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

const extractAt = (encounter?: EncounterFragment, options?: Options): Date => {
  if (!encounter) {
    return new Date();
  }
  const beforeDate = new Date(new Date(encounter.startDatetime).getTime() - 1);
  if (!options || !options.at) {
    return beforeDate;
  }

  switch (options.at) {
    case 'before': {
      return beforeDate;
    }
    case 'start': {
      return new Date(encounter.startDatetime);
    }
    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ((_: never) => {})(options.at);
  }
  return new Date();
};

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
  const { label, uischema } = props;

  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const encounterId = useEncounter.utils.idFromUrl();
  const { data: currentEncounter } = useEncounter.document.byId(encounterId);

  const { data: events } = useProgramEvents.document.list(
    {
      at: extractAt(currentEncounter, options),
      patientId: currentEncounter?.patient?.id ?? '',
      filter: {
        type: {
          equalTo: options?.eventType,
        },
        documentType: {
          equalTo: currentEncounter?.type,
        },
      },
      page: {
        first: 1,
      },
    },
    !!currentEncounter
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

/**
 * Shows a value from the program events
 */
export const EncounterProgramEvent = withJsonFormsControlProps(UIComponent);
