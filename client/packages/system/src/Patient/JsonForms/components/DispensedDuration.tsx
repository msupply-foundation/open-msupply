import React, { useEffect, useState } from 'react';
import {
  rankWith,
  ControlProps,
  uiTypeIs,
  composePaths,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
  useDebounceCallback,
  NumericTextInput,
  DateUtils,
  useZodOptionsValidation,
} from '@openmsupply-client/common';
import { get as extractProperty } from 'lodash';
import { z } from 'zod';
import { EncounterEvent } from './encounter_event';

type OptionEvent = {
  scheduleIn: {
    days?: number;
    minutes?: number;
  };
  documentType: string;
  name?: string;
  type: string;
};

type Options = {
  /** Field name of the target data field */
  targetField: string;
  /**
   * Field name of a datetime value in the data. This field is used as the base datetime to
   * calculate the datetime when the patient runs out of medicine: baseDatetime + daysDispensed.
   */
  baseDatetimeField: string;
  /** For testing: schedule an event now instead based on the baseDatetimeField */
  scheduleEventsNow?: boolean;
  events: OptionEvent[];
};

const OptionEvent: z.ZodType<OptionEvent> = z
  .object({
    scheduleIn: z.object({
      days: z.number().optional(),
      minutes: z.number().optional(),
    }),
    documentType: z.string(),
    name: z.string().optional(),
    type: z.string(),
  })
  .strict();

const Options: z.ZodType<Options> = z
  .object({
    targetField: z.string(),
    baseDatetimeField: z.string(),
    scheduleEventsNow: z.boolean().optional(),
    events: z.array(OptionEvent),
  })
  .strict();

const DISPENSED_DURATION_GROUP = 'DispensedDuration';
const scheduleEvent = (
  event: OptionEvent,
  baseDatetime: Date
): EncounterEvent => {
  const datetimeDays = DateUtils.addDays(
    baseDatetime,
    event.scheduleIn?.days ?? 0
  );
  const datetime = DateUtils.addMinutes(
    datetimeDays,
    event.scheduleIn?.minutes ?? 0
  );

  return {
    activeDatetime: datetime.toISOString(),
    documentType: event.documentType,
    group: DISPENSED_DURATION_GROUP,
    name: event.name,
    type: event.type,
  };
};

export const dispensedDurationTester = rankWith(
  10,
  uiTypeIs('DispensedDuration')
);

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema } = props;
  const [localData, setLocalData] = useState<number>();
  const [baseTime, setBaseTime] = useState<string | undefined>();
  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const onChange = useDebounceCallback(
    (value: number) => {
      // update events
      if (!options) {
        return;
      }

      const fullPath = composePaths(path, options.targetField);
      handleChange(fullPath, value);

      const existingEvents: EncounterEvent[] =
        extractProperty(data, 'events') ?? [];

      if (baseTime === undefined) {
        throw Error('Unexpected error');
      }
      // Remove existing events for the group
      const events = existingEvents.filter(
        it => it.group !== DISPENSED_DURATION_GROUP
      );
      if (value > 0) {
        const scheduleStartTime = options.scheduleEventsNow
          ? new Date()
          : DateUtils.startOfDay(DateUtils.addDays(new Date(baseTime), value));
        events.push(
          ...options.events.map(e => scheduleEvent(e, scheduleStartTime))
        );
      }

      const eventsPath = composePaths(path, 'events');
      handleChange(eventsPath, events);
    },
    [path, options, baseTime]
  );
  const error = !!errors;

  useEffect(() => {
    if (options) {
      setLocalData(extractProperty(data, options.targetField) ?? 0);
    }
  }, [data, options]);
  useEffect(() => {
    setBaseTime(extractProperty(data, options?.baseDatetimeField ?? ''));
  }, [data, options]);
  if (!props.visible) {
    return null;
  }
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      marginTop={1}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box flexBasis={FORM_INPUT_COLUMN_WIDTH}>
        <NumericTextInput
          type="number"
          InputProps={{
            sx: { '& .MuiInput-input': { textAlign: 'right' } },
          }}
          onChange={value => {
            setLocalData(value);
            onChange(value);
          }}
          disabled={!props.enabled || baseTime === undefined}
          error={error}
          helperText={errors}
          value={localData ?? ''}
        />
      </Box>
    </Box>
  );
};

export const DispensedDuration = withJsonFormsControlProps(UIComponent);
