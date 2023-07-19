import React, { useEffect } from 'react';
import {
  composePaths,
  ControlProps,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  BasicTextInput,
  Box,
  DetailInputWithLabelRow,
  NumUtils,
  ObjUtils,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH, JsonData, useZodOptionsValidation } from '../common';
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
  formData: JsonData | undefined,
  eventType: string | undefined
): { source: 'previous' | 'form' | undefined; height: number | undefined } => {
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

  if (ObjUtils.isObject(formData) && formData['height'])
    return {
      height: Number.parseFloat(formData['height'] as string),
      source: 'form',
    };

  const event = events?.nodes[0];
  if (event?.data === undefined || event?.data === null) {
    return { height: undefined, source: undefined };
  }
  return { height: Number.parseFloat(event.data), source: 'previous' };
};

const UIComponent = (props: ControlProps) => {
  const t = useTranslation('programs');
  const { data, handleChange, label, path, uischema } = props;
  const { weight } = data ?? {};
  const { options } = useZodOptionsValidation(Options, uischema.options);
  const { height, source } = usePreviousHeight(data, options?.eventType);

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
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      Input={
        <Box
          flexBasis={'100%'}
          display="flex"
          alignItems="center"
          // gap={FORM_GAP}
        >
          <BasicTextInput
            disabled
            value={data?.bodyMassIndex ?? ''}
            sx={{ margin: 0.5, width: '90px' }}
            textAlign="right"
          />
          {weight && source === 'previous' && (
            <Typography sx={{ maxWidth: 150, fontSize: '75%' }}>
              ({t('label.bmi-prev-height-message', { height })})
            </Typography>
          )}
        </Box>
      }
    />
  );
};

export const BMI = withJsonFormsControlProps(UIComponent);
