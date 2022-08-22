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
  NumUtils,
  DateUtils,
} from '@openmsupply-client/common';
import { get as extractProperty } from 'lodash';
import { z } from 'zod';
import { useZodOptionsValidation } from '../useZodOptionsValidation';

type OptionEvent = {
  scheduleIn: {
    days?: number;
    minutes?: number;
  };
  name?: string;
  group?: string;
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
    name: z.string().optional(),
    group: z.string().optional(),
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

interface EncounterEvent {
  /**
   * Time of the the event, can be in the future
   *
   * @format date-time
   */
  datetime: string;
  group?: string;

  /**
   * Name of this specific event. There could be multiple events of the same type but with different
   * names.
   * For example, two event could have type 'status' and name "Status name 1" and "Status name 2"
   */
  name?: string;
  /**
   * For example, encounter 'status'.
   */
  type: string;
}

const scheduleEvent = (event: OptionEvent, baseTime: Date): EncounterEvent => {
  const datetimePlusMin = DateUtils.addMinutes(
    baseTime,
    event.scheduleIn?.minutes ?? 0
  );
  const datetime = DateUtils.addDays(
    datetimePlusMin,
    event.scheduleIn?.days ?? 0
  );
  return {
    datetime: datetime.toISOString(),
    group: event.group,
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

      let events: EncounterEvent[] = [];
      if (baseTime === undefined) {
        throw Error('Unexpected error');
      }
      if (value > 0) {
        const scheduleStartTime = options.scheduleEventsNow
          ? new Date()
          : DateUtils.startOfDay(DateUtils.addDays(new Date(baseTime), value));
        events = options.events.map(e => scheduleEvent(e, scheduleStartTime));
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
  }, [options]);
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
          onChange={e => {
            const newValue = NumUtils.parseString(e.target.value);
            setLocalData(newValue);
            onChange(newValue);
          }}
          disabled={!props.enabled || baseTime === undefined}
          error={error}
          helperText={errors}
          value={localData}
        />
      </Box>
    </Box>
  );
};

export const DispensedDuration = withJsonFormsControlProps(UIComponent);
