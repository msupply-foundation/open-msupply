import React, { useEffect, useState } from 'react';
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
  DateUtils,
  useTranslation,
  FormLabel,
  DetailInputWithLabelRow,
} from '@openmsupply-client/common';
import {
  DefaultFormRowSx,
  FORM_INPUT_COLUMN_WIDTH,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../common';
import { z } from 'zod';
import { EncounterFragment, useEncounter, useProgramEvents } from '../../api';
import { extractProperty } from '@common/utils';

export const adherenceScoreTester = rankWith(10, uiTypeIs('AdherenceScore'));

const Options = z
  .object({
    /**
     * Source of where to get the previous count.
     * Either:
     * - 'Field': A data field from the previous encounter
     * - 'EncounterEvent': The latest event before the current encounter.
     */
    previousCount: z.discriminatedUnion('source', [
      z.object({ source: z.literal('Field'), field: z.string() }),
      z.object({ source: z.literal('EncounterEvent'), eventType: z.string() }),
    ]),
    /**
     * Field name of the remaining count field.
     * For example: `remainingCountField: 'medication.remainingPillCount'`
     */
    remainingCountField: z.string(),
    /** Expected number of pills per day that a patient is suppose to take. */
    countPerDay: z.number(),
    /** Location where to store the adherence status */
    targetField: z.string(),
  })
  .strict();
type Options = z.infer<typeof Options>;

/** Returns [field, eventType] */

const extractSource = (
  options: Options | undefined
): [string | undefined, string | undefined] => {
  if (!options) return [undefined, undefined];

  switch (options.previousCount.source) {
    case 'Field':
      return [options.previousCount.field, undefined];
    case 'EncounterEvent':
      return [undefined, options.previousCount.eventType];
  }
};

type PreviousCount = {
  count: number;
  time: Date;
};

const usePreviousCountFromEvent = (
  currentEncounter: EncounterFragment | undefined,
  encounterEventType: string | undefined
): PreviousCount | undefined => {
  const beforeDate = currentEncounter
    ? new Date(new Date(currentEncounter.startDatetime).getTime() - 1)
    : undefined;
  const { data: events } = useProgramEvents.document.list(
    {
      at: beforeDate,
      filter: {
        patientId: { equalTo: currentEncounter?.patient?.id ?? '' },
        type: {
          equalTo: encounterEventType,
        },
        documentType: {
          equalTo: currentEncounter?.type,
        },
      },
      page: {
        first: 1,
      },
    },
    !!currentEncounter && !!encounterEventType
  );
  const event = events?.nodes[0];
  if (event?.data === undefined || event?.data === null) {
    return undefined;
  }
  const count = Number.parseFloat(event.data);
  if (isNaN(count)) return undefined;

  return {
    count,
    time: new Date(event.activeStartDatetime),
  };
};

const usePreviousCountFromField = (
  currentEncounter: EncounterFragment | undefined,
  field: string | undefined
): PreviousCount | undefined => {
  const { data: previousEncounter } = useEncounter.document.previous(
    currentEncounter?.patient.id,
    currentEncounter?.startDatetime
      ? new Date(currentEncounter?.startDatetime)
      : new Date(),
    !!field
  );

  if (!previousEncounter || field === undefined) {
    return undefined;
  }

  const previousCountOnHand = extractProperty(
    previousEncounter.document.data,
    field
  );

  return {
    count: previousCountOnHand,
    time: new Date(previousEncounter.startDatetime),
  };
};

const usePreviousCount = (
  options: Options | undefined,
  currentEncounter: EncounterFragment | undefined
): PreviousCount | undefined => {
  const [field, encounterEventType] = extractSource(options);

  const countFormEvent = usePreviousCountFromEvent(
    currentEncounter,
    encounterEventType
  );
  const countFromField = usePreviousCountFromField(currentEncounter, field);

  if (countFormEvent !== undefined) {
    return countFormEvent;
  }
  if (countFromField !== undefined) {
    return countFromField;
  }

  return undefined;
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, uischema, path } = props;
  const [targetPath, setTargetPath] = useState<string | undefined>();
  const [warning, setWarning] = useState<string | undefined>();
  const [adherenceScore, setAdherenceScore] = useState<number | undefined>();
  const t = useTranslation('programs');

  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  useEffect(() => {
    if (!options) {
      return;
    }
    const targetPath = composePaths(path, options.targetField);
    setTargetPath(targetPath);
    setAdherenceScore(extractProperty(data, targetPath));
  }, [options, path, data, targetPath]);

  // fetch current encounter
  const encounterId = useEncounter.utils.idFromUrl();
  const { data: currentEncounter } = useEncounter.document.byId(encounterId);

  const previousCount = usePreviousCount(options, currentEncounter);

  useEffect(() => {
    if (
      !options ||
      !currentEncounter ||
      previousCount === undefined ||
      !targetPath
    ) {
      return undefined;
    }

    const remainingCount = extractProperty(data, options.remainingCountField);

    if (previousCount.count < remainingCount) {
      setAdherenceScore(undefined);
      setWarning(
        t('control.adherence-status-warning', {
          remainingCount,
          previousCountOnHand: previousCount.count,
        })
      );
      return;
    } else {
      setWarning(undefined);
    }
    const timeDiffMs =
      new Date(currentEncounter.startDatetime).getTime() -
      previousCount.time.getTime();

    // Target pill count needed for the whole timespan from last till current encounter
    const timeDiffDays = timeDiffMs / DateUtils.DAY;
    const targetPillCount = timeDiffDays * options.countPerDay;

    const status =
      ((previousCount.count - remainingCount) / targetPillCount) * 100;

    if (Number.isFinite(status) && status !== adherenceScore) {
      handleChange(targetPath, status);
      setAdherenceScore(status);
    }
  }, [
    options,
    previousCount,
    currentEncounter,
    data,
    targetPath,
    adherenceScore,
    t,
    handleChange,
  ]);

  if (!props.visible) {
    return null;
  }

  const inputProps = {
    InputProps: {
      sx: { width: '90px', '& .MuiInput-input': { textAlign: 'right' } },
    },
    disabled: true,
    error: !!errors,
    helperText: errors,
    value: adherenceScore !== undefined ? `${adherenceScore.toFixed(1)}%` : '',
  };
  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <Box
          flexBasis={FORM_INPUT_COLUMN_WIDTH}
          display="flex"
          alignItems="center"
        >
          <BasicTextInput {...inputProps} />
          <FormLabel
            sx={{
              color: 'warning.main',
              fontSize: '12px',
              marginLeft: '10px',
            }}
          >
            {warning}
          </FormLabel>
        </Box>
      }
    />
  );
};

export const AdherenceScore = withJsonFormsControlProps(UIComponent);
