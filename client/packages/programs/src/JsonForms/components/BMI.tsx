import React, { useEffect } from 'react';
import {
  composePaths,
  ControlProps,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow, NumUtils } from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH, useZodOptionsValidation } from '../common';
import { z } from 'zod';
import { useEncounter, useProgramEvents } from '../../api';

export const bmiTester = rankWith(10, uiTypeIs('BMI'));

const round = (value: number) => Math.round(value * 100) / 100;

const Options = z
  .object({
    /**
     * Event type to check for "height" value. If not provided, it will always
     * retrieve from "height" property of current form data.
     */
    eventType: z.string().optional(),
  })
  .strict();
type Options = z.infer<typeof Options>;

const usePreviousHeight = (
  formData: any | undefined,
  eventType: string | undefined
) => {
  // fetch current encounter
  const encounterId = useEncounter.utils.idFromUrl();
  const { data: currentEncounter } = useEncounter.document.byId(encounterId);
  const { data: events } = useProgramEvents.document.list(
    {
      filter: {
        patientId: { equalTo: currentEncounter?.patient?.id ?? '' },
        type: {
          equalTo: eventType,
        },
        documentType: {
          equalTo: currentEncounter?.type,
        },
      },
      page: {
        first: 1,
      },
    },
    !!currentEncounter && !!eventType
  );

  if (formData && formData.height) return formData.height;

  const event = events?.nodes[0];
  if (event?.data === undefined || event?.data === null) {
    return undefined;
  }
  return Number.parseFloat(event.data);
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema } = props;
  const { weight } = data ?? {};
  const { options } = useZodOptionsValidation(Options, uischema.options);
  const height = usePreviousHeight(data, options?.eventType);

  useEffect(() => {
    if (!height || !weight) return;

    const w = NumUtils.parseString(weight);

    if (!handleChange || !w) return;

    const bmi = round(w / height ** 2);
    handleChange(composePaths(path, 'bodyMassIndex'), bmi);
  }, [height, weight]);

  if (!props.visible) {
    return null;
  }

  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: data?.bodyMassIndex ?? '',
        sx: { margin: 0.5, width: '100px' },
        disabled: true,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
    />
  );
};

export const BMI = withJsonFormsControlProps(UIComponent);
