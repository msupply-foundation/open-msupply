import React, { useEffect } from 'react';
import {
  ControlProps,
  composePaths,
  rankWith,
  subErrorsAt,
  uiTypeIs,
} from '@jsonforms/core';
import {
  Box,
  DetailInputWithLabelRow,
  NumUtils,
  NumericTextInput,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../common';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { useJSONFormsCustomError } from '../common/hooks/useJSONFormsCustomError';

export const bloodPressureTester = rankWith(10, uiTypeIs('BloodPressure'));

export const UIComponent = (props: ControlProps) => {
  const t = useTranslation('programs');
  const { data, handleChange, label, path, schema } = props;
  const { core } = useJsonForms();
  const [systolic, setSystolic] = React.useState<number | undefined>(undefined);
  const [diastolic, setDiastolic] = React.useState<number | undefined>(
    undefined
  );
  const systolicPath = composePaths(path, 'systolic');
  const diastolicPath = composePaths(path, 'diastolic');
  const { customError, setCustomError } = useJSONFormsCustomError(
    path,
    'BloodPressure'
  );

  console.log('core ', core?.errors);

  useEffect(() => {
    if (core) {
      const getChildErrors = subErrorsAt(path, schema);
      const errors = getChildErrors(core);
      setCustomError(errors[0]?.message);
    }
  }, [core]);

  if (!props.visible) {
    return null;
  }

  const onChangeSystolic = (value: number | undefined) => {
    setSystolic(value);
    handleChange(systolicPath, value);

    if (!value && diastolic === undefined) {
      handleChange(path, undefined);
    }
  };

  const onChangeDiastolic = (value: number | undefined) => {
    setDiastolic(value);
    handleChange(diastolicPath, value);

    if (!value && systolic === undefined) {
      handleChange(path, undefined);
    }
  };

  useEffect(() => {
    if (data) {
      setSystolic(data.systolic);
      setDiastolic(data.diastolic);
    }
  }, [data]);

  const inputProps = {
    type: 'number',
    min: schema.minimum ?? 0,
    max: schema.maximum ?? NumUtils.MAX_SAFE_API_INTEGER,
    error: !!customError,
    InputLabelProps: { shrink: true },
  };

  return (
    <DetailInputWithLabelRow
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      sx={{ paddingTop: 1 }}
      Input={
        <Box display="flex" flexDirection="column">
          <Box display="flex" flexDirection="row" paddingLeft={0.5}>
            <NumericTextInput
              onChange={onChangeSystolic}
              value={systolic}
              label={t('label.systolic')}
              {...inputProps}
            />
            <Typography margin={1} paddingTop={2}>
              /
            </Typography>
            <NumericTextInput
              onChange={onChangeDiastolic}
              value={diastolic}
              label={t('label.diastolic')}
              width={100}
              {...inputProps}
            />
          </Box>
          <Box display="flex" flexDirection="row" alignSelf="center">
            {customError && (
              <Typography variant="caption">{customError}</Typography>
            )}
          </Box>
        </Box>
      }
    />
  );
};

export const BloodPressure = withJsonFormsControlProps(UIComponent);
