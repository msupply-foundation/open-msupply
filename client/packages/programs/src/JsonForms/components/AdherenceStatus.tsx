import React, { useEffect, useMemo, useState } from 'react';
import {
  composePaths,
  ControlProps,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow } from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH, useZodOptionsValidation } from '../common';
import { z } from 'zod';
import { useEncounter } from '../../api';
import { get as extractProperty } from 'lodash';

export const adherenceStatusTester = rankWith(10, uiTypeIs('AdherenceStatus'));

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
  const [adherenceStatus, setAdherenceStatus] = useState<number | undefined>();

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
    setAdherenceStatus(extractProperty(data, targetPath));
  }, [options, path]);
  useEffect(() => {}, [targetPath]);

  // fetch current encounter
  const encounterId = useEncounter.utils.idFromUrl();
  const { data: currentEncounter, mutate: fetchEncounter } =
    useEncounter.document.byId(encounterId);
  useEffect(() => {
    fetchEncounter();
  }, [encounterId]);

  // fetch previous encounter
  const { data: previousEncounter, mutate: fetchPreviousEncounter } =
    useEncounter.document.previous(
      currentEncounter?.patient.id ?? '',
      currentEncounter?.startDatetime
        ? new Date(currentEncounter?.startDatetime)
        : new Date()
    );
  useEffect(() => {
    if (currentEncounter) {
      fetchPreviousEncounter();
    }
  }, [currentEncounter]);

  const params:
    | {
        previousCountOnHand: number;
        remainingCount: number;
        countPerDay: number;
        timeDiffMs: number;
      }
    | undefined = useMemo(() => {
    if (!options || !currentEncounter || !previousEncounter || !targetPath) {
      return undefined;
    }

    const previousCountOnHand = extractProperty(
      previousEncounter.document.data,
      options.previousCountField
    );
    const remainingCount = extractProperty(data, options.remainingCountField);
    const timeDiffMs =
      new Date(currentEncounter.startDatetime).getTime() -
      new Date(previousEncounter.startDatetime).getTime();

    // Target pill count needed for the whole timespan from last till current encounter
    const timeDiffDays = timeDiffMs / 1000 / 60 / 60 / 24;
    const targetPillCount = timeDiffDays * options.countPerDay;
    const status =
      ((previousCountOnHand - remainingCount) / targetPillCount) * 100;

    if (Number.isFinite(status) && status !== adherenceStatus) {
      handleChange(targetPath, status);
      setAdherenceStatus(status);
    }

    return {
      previousCountOnHand,
      remainingCount,
      countPerDay: options.countPerDay,
      timeDiffMs,
    };
  }, [options, previousEncounter, currentEncounter, data, targetPath]);

  useEffect(() => {
    if (!params || targetPath === undefined) {
      return;
    }
  }, [params, targetPath]);

  if (!props.visible) {
    return null;
  }

  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value:
          adherenceStatus !== undefined ? `${adherenceStatus.toFixed(1)}` : '',
        sx: { margin: 0.5, width: '100px' },
        disabled: true,
        error: !!errors,
        helperText: errors,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
    />
  );
};

export const AdherenceStatus = withJsonFormsControlProps(UIComponent);
