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
  useDebounceCallback,
  PositiveNumberInput,
  useTranslation,
} from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
  useZodOptionsValidation,
} from '../common';
import { get as extractProperty } from 'lodash';
import { z } from 'zod';

type Options = {
  viralLoadResult: string;
  viralLoadStatus: string;
};

const Options: z.ZodType<Options> = z
  .object({
    viralLoadResult: z.string(),
    viralLoadStatus: z.string(),
  })
  .strict();

export const viralLoadResultTester = rankWith(11, uiTypeIs('ViralLoadResult'));

const getviralLoadStatus = (
  t: ReturnType<typeof useTranslation>,
  result: number
): string => {
  if (result <= 1000) {
    return t('text.suppressed');
  }
  return t('text.unsuppressed');
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema } = props;
  const [result, setResult] = useState<number | undefined>(undefined);
  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const t = useTranslation('programs');

  const onChange = useDebounceCallback(
    (value: number) => {
      if (!options) return;

      const result = composePaths(path, options.viralLoadResult);
      handleChange(result, value);

      const status = composePaths(path, options.viralLoadStatus);
      if (value <= 1000) {
        handleChange(status, t('text.suppressed'))
      } else {
        handleChange(status, t('text.unsuppressed'))
      }
    },
    [path, options]
  );

  useEffect(() => {
    if (options) {
      setResult(extractProperty(data, options.viralLoadResult) ?? undefined);
    }
  }, [data, options]);

  const error = !!errors;
  const viralLoadStatus = result
    ? getviralLoadStatus(t, result || 0)
    : undefined;

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
      <Box
        flexBasis={FORM_INPUT_COLUMN_WIDTH}
        display="flex"
        alignItems="center"
        gap={2}
      >
        <PositiveNumberInput
          min={0}
          type="number"
          InputProps={{
            sx: { '& .MuiInput-input': { textAlign: 'right' } },
          }}
          onChange={value => {
            setResult(value);
            onChange(value);
          }}
          disabled={!props.enabled}
          error={error}
          helperText={errors}
          value={result ?? ''}
        />
        <Box
          flex={0}
          style={{ textAlign: 'end' }}
          flexBasis={FORM_LABEL_COLUMN_WIDTH}
        >
          <FormLabel sx={{ fontWeight: 'bold' }}>
            {t('label.viral-load-status')}:
          </FormLabel>
        </Box>
        <FormLabel>{viralLoadStatus ? viralLoadStatus : ''}</FormLabel>
      </Box>
    </Box>
  );
};

export const ViralLoadResult = withJsonFormsControlProps(UIComponent);
