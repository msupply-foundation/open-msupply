import React, { useEffect } from 'react';
import {
  rankWith,
  ControlProps,
  uiTypeIs,
  composePaths,
} from '@jsonforms/core';
import { withJsonFormsControlProps, useJsonForms } from '@jsonforms/react';
import { FormLabel } from '@mui/material';
import { useDebounceCallback, DateUtils } from '@openmsupply-client/common';
import { get as extractProperty } from 'lodash';
import { z } from 'zod';
import _ from 'lodash';
import { EncounterEvent } from './EncounterEvent';
import { useZodOptionsValidation } from '../common';

type OptionEvent = {
  scheduleIn?: {
    days?: number;
    minutes?: number;
  };
  documentType: string;
  documentName?: boolean;
  name?: string;
  type: string;
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

  /**
   * The group field can is used to group or "tag" events so that this UI component knows which
   * events to update.
   */
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
    documentType: z.string(),
    documentName: z.boolean().optional(),
    name: z.string().optional(),
    type: z.string(),
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

export interface Practitioner {
  id?: string;
  firstName?: string;
  lastName?: string;
}

const scheduleEvent = (
  event: OptionEvent,
  baseDatetime: Date,
  group: string,
  documentName?: string
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
    documentName,
    group,
    name: event.name,
    type: event.type,
  };
};

export const eventTriggerTester = rankWith(10, uiTypeIs('EventTrigger'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, path, uischema, config } = props;
  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const ctx = useJsonForms();
  const fullData = ctx.core?.data ?? {};
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
        fullData,
        options.baseDatetimeField
      );
      const datetime = new Date(datetimeField);

      const existingEvents: EncounterEvent[] =
        extractProperty(fullData, 'events') ?? [];

      // Remove existing events for the group
      const events = existingEvents.filter(it => it.group !== options.group);
      for (const eventOption of options.events) {
        const documentName = eventOption?.documentName
          ? config?.documentName
          : undefined;
        events.push(
          scheduleEvent(eventOption, datetime, options.group, documentName)
        );
      }

      // Don't update the data if nothing has changed
      if (_.isEqual(events, existingEvents)) {
        return;
      }

      const eventsPath = composePaths(path, 'events');
      handleChange(eventsPath, events);
    },
    [path, options, fullData]
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
