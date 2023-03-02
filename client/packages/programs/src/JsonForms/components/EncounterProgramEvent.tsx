import React from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow } from '@openmsupply-client/common';
import {
  DefaultFormRowSpacing,
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
    type: z.string(),
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
          equalTo: options?.type,
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

  if (!props.visible) {
    return null;
  }

  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: event?.data ?? '',
        disabled: true,
        required: props.required,
        sx: DefaultFormRowSpacing,
        error: !!errors,
        helperText: errors,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
    />
  );
};

/**
 * Shows a value from the program events
 */
export const EncounterProgramEvent = withJsonFormsControlProps(UIComponent);
