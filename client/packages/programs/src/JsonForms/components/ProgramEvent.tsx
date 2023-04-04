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

export const programEventTester = rankWith(10, uiTypeIs('ProgramEvent'));

/**
 * Program events work with specific encounters, or generically
 * (by providing both a documentType and eventType). Encounters still
 * need to be fetched from the api since some encounters
 * require events to be filtered out by the encounter start datetime.
 */
const Options = z
  .object({
    /**
     * This option should only be configured for encounters.
     * Time of the encounter event:
     * `before`: just before the current encounter
     * `at`: at the start of the current encounter
     * Default: `before`
     */
    encounterStartDatetime: z.enum(['before', 'at']).optional(),
    /**
     * Doesn't need to be specified for encounters.
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

const extractAt = (encounter?: EncounterFragment, options?: Options): Date => {
  if (!encounter) {
    return new Date();
  }
  const beforeDate = new Date(new Date(encounter.startDatetime).getTime() - 1);
  if (!options || !options.encounterStartDatetime) {
    return beforeDate;
  }

  switch (options.encounterStartDatetime) {
    case 'before': {
      return beforeDate;
    }
    case 'at': {
      return new Date(encounter.startDatetime);
    }
    default:
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ((_: never) => {})(options.encounterStartDatetime);
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

  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const encounterId = useEncounter.utils.idFromUrl();
  const { data: currentEncounter } = useEncounter.document.byId(encounterId);
  const patientId = config?.patientId;

  const { data: events } = useProgramEvents.document.list({
    at: currentEncounter ? extractAt(currentEncounter, options) : undefined,
    patientId: patientId ?? '',
    filter: {
      type: {
        equalTo: options?.eventType,
      },
      documentType: {
        equalTo: options?.documentType
          ? options?.documentType
          : currentEncounter?.type,
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

/**
 * Shows a value from the program events
 */
export const ProgramEvent = withJsonFormsControlProps(UIComponent);
