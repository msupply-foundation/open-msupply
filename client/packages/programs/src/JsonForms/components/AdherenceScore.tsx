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
} from '@openmsupply-client/common';
import {
  FORM_INPUT_COLUMN_WIDTH,
  FORM_LABEL_COLUMN_WIDTH,
  useZodOptionsValidation,
} from '../common';
import { z } from 'zod';
import { useEncounter } from '../../api';
import { get as extractProperty } from 'lodash';
import { FormLabel } from '@mui/material';

export const adherenceScoreTester = rankWith(10, uiTypeIs('AdherenceScore'));

type Options = {
  /**
   * Field name for the dispense count is stored.
   * This field is loaded from the previous encounter.
   *
   * For example: `previousDispensedCountField: 'arvMedication.numberOfDaysDispensed'`
   */
  previousCountField: string;
  /**
   * Field name of the remaining count field.
   * For example: `remainingCountField: 'arvMedication.remainingPillCount'`
   */
  remainingCountField: string;
  /** Expected number of pills per day that a patient is suppose to take. */
  countPerDay: number;

  /** Location where to store the adherence status */
  targetField: string;
};

const Options: z.ZodType<Options> = z
  .object({
    previousCountField: z.string(),
    remainingCountField: z.string(),
    countPerDay: z.number(),
    targetField: z.string(),
  })
  .strict();

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
  }, [options, path]);

  // fetch current encounter
  const encounterId = useEncounter.utils.idFromUrl();
  const { data: currentEncounter } = useEncounter.document.byId(encounterId);

  // fetch previous encounter
  const { data: previousEncounter } = useEncounter.document.previous(
    currentEncounter?.patient.id,
    currentEncounter?.startDatetime
      ? new Date(currentEncounter?.startDatetime)
      : new Date()
  );

  useEffect(() => {
    if (!options || !currentEncounter || !previousEncounter || !targetPath) {
      return undefined;
    }

    const previousCountOnHand = extractProperty(
      previousEncounter.document.data,
      options.previousCountField
    );
    const remainingCount = extractProperty(data, options.remainingCountField);

    if (previousCountOnHand < remainingCount) {
      setAdherenceScore(undefined);
      setWarning(
        t('control.adherence-status-warning', {
          remainingCount,
          previousCountOnHand,
        })
      );
      return;
    } else {
      setWarning(undefined);
    }
    const timeDiffMs =
      new Date(currentEncounter.startDatetime).getTime() -
      new Date(previousEncounter.startDatetime).getTime();

    // Target pill count needed for the whole timespan from last till current encounter
    const timeDiffDays = timeDiffMs / DateUtils.DAY;
    const targetPillCount = timeDiffDays * options.countPerDay;

    const status =
      ((previousCountOnHand - remainingCount) / targetPillCount) * 100;

    if (Number.isFinite(status) && status !== adherenceScore) {
      handleChange(targetPath, status);
      setAdherenceScore(status);
    }
  }, [options, previousEncounter, currentEncounter, data, targetPath]);

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
      <Box
        flexBasis={FORM_INPUT_COLUMN_WIDTH}
        display="flex"
        alignItems="center"
      >
        <BasicTextInput {...inputProps} />
        <FormLabel
          sx={{ color: 'warning.main', fontSize: '12px', marginLeft: '10px' }}
        >
          {warning}
        </FormLabel>
      </Box>
    </Box>
  );
};

export const AdherenceScore = withJsonFormsControlProps(UIComponent);
