import React, { useEffect } from 'react';
import {
  rankWith,
  ControlProps,
  uiTypeIs,
  composePaths,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel } from '@mui/material';
import { useDebounceCallback, DateUtils } from '@openmsupply-client/common';
import { get as extractProperty } from 'lodash';
import { z } from 'zod';
import { useZodOptionsValidation } from '../useZodOptionsValidation';
import _ from 'lodash';

type OptionEvent = {
  scheduleIn?: {
    days?: number;
    minutes?: number;
  };
  name?: string;
  type: string;
  context?: {
    value?: string;
    documentName?: boolean;
  };
};

type EventTrigger = {
  triggerField: string;

  isFalsy?: boolean;
  isTruthy?: boolean;

  // Enable to support OR
  // or?: EventTrigger[];
};

type Options = {
  /**
   * Field name of a datetime value in the data.
   */
  baseDatetimeField: string;
  /** Triggers evaluated with an AND */
  trigger: EventTrigger[];
  /** All events have to be in the same group */
  group: string;
  /** Event to be emitted when trigger is fulfilled */
  events: OptionEvent[];
};

const OptionEvent: z.ZodType<OptionEvent> = z
  .object({
    scheduleIn: z
      .object({
        days: z.number().optional(),
        minutes: z.number().optional(),
      })
      .optional(),
    name: z.string().optional(),
    type: z.string(),
    context: z.object({
      value: z.string().optional(),
      documentName: z.boolean().optional(),
    }),
  })
  .strict();

const TriggerCondition: z.ZodType<EventTrigger> = z
  .object({
    triggerField: z.string(),
    isFalsy: z.boolean().optional(),
    isTruthy: z.boolean().optional(),
  })
  .strict();

const Options: z.ZodType<Options> = z
  .object({
    baseDatetimeField: z.string(),
    trigger: z.array(TriggerCondition),
    group: z.string(),
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
  context?: string;
}

const scheduleEvent = (
  event: OptionEvent,
  baseDatetime: Date,
  group?: string,
  context?: string
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
    datetime: datetime.toISOString(),
    group,
    name: event.name,
    type: event.type,
    context,
  };
};

export const eventTriggerTester = rankWith(10, uiTypeIs('EventTrigger'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, path, uischema, config } = props;
  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const trigger = useDebounceCallback(
    data => {
      if (!options) {
        return;
      }

      // evaluate the trigger
      const trigger = options.trigger.every(t => {
        const field = extractProperty(data, t.triggerField);
        if (t.isFalsy && !field) {
          return true;
        } else if (t.isTruthy && !!field) {
          return true;
        }
        return false;
      });
      if (!trigger) {
        return;
      }

      const datetimeField: string = extractProperty(
        data,
        options.baseDatetimeField
      );
      const datetime = new Date(datetimeField);

      const existingEvents: EncounterEvent[] =
        extractProperty(data, 'events') ?? [];

      // Remove existing events for the group
      const events = existingEvents.filter(it => it.group !== options.group);
      for (const eventOption of options.events) {
        const context =
          eventOption.context?.value ??
          (eventOption.context?.documentName
            ? config?.documentName
            : undefined);
        events.push(
          scheduleEvent(eventOption, datetime, options.group, context)
        );
      }

      // Don't update the data if nothing has changed
      if (_.isEqual(events, existingEvents)) {
        return;
      }

      const eventsPath = composePaths(path, 'events');
      handleChange(eventsPath, events);
    },
    [path, options]
  );

  useEffect(() => {
    trigger(data);
  }, [data, options]);

  if (!!errors) {
    return <FormLabel>{errors}:</FormLabel>;
  }
  return null;
};

export const EventTrigger = withJsonFormsControlProps(UIComponent);
