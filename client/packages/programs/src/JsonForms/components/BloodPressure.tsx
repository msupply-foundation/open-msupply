import React, { useEffect } from 'react';
import { ControlProps, rankWith, subErrorsAt, uiTypeIs } from '@jsonforms/core';
import {
  Box,
  DetailInputWithLabelRow,
  NumUtils,
  NumericTextInput,
  Typography,
  useDebounceCallback,
  useTranslation,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../common';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { useJSONFormsCustomError } from '../common/hooks/useJSONFormsCustomError';

export const bloodPressureTester = rankWith(10, uiTypeIs('BloodPressure'));

type BloodPressureData = {
  systolic?: number;
  diastolic?: number;
};

export const UIComponent = (props: ControlProps) => {
  const t = useTranslation('programs');
  const { data, handleChange, label, path, schema } = props;
  const { core } = useJsonForms();
  const [bloodPressure, setBloodPressure] = React.useState<
    BloodPressureData | undefined
  >(data);

  const { customError, setCustomError } = useJSONFormsCustomError(
    path,
    'BloodPressure'
  );

  useEffect(() => {
    if (core) {
      const getChildErrors = subErrorsAt(path, schema);
      const errors = getChildErrors(core);
      setCustomError(errors[0]?.message);
    }
  }, [core]);

  const onChange = useDebounceCallback(
    (value: BloodPressureData) => {
      if (value.diastolic === undefined && value.systolic === undefined) {
        handleChange(path, undefined);
      } else {
        handleChange(path, value);
      }
    },
    [path]
  );

  if (!props.visible) {
    return null;
  }

  const inputProps = {
    type: 'number',
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
              onChange={value => {
                const newBP = {
                  ...bloodPressure,
                  systolic: value,
                };
                setBloodPressure(newBP);
                onChange(newBP);
              }}
              value={bloodPressure?.systolic}
              label={t('label.systolic')}
              min={schema.properties?.['systolic']?.minimum ?? 0}
              max={
                schema.properties?.['systolic']?.maximum ??
                NumUtils.MAX_SAFE_API_INTEGER
              }
              {...inputProps}
            />
            <Typography margin={1} paddingTop={2}>
              /
            </Typography>
            <NumericTextInput
              onChange={value => {
                const newBP = {
                  ...bloodPressure,
                  diastolic: value,
                };
                setBloodPressure(newBP);
                onChange(newBP);
              }}
              value={bloodPressure?.diastolic}
              label={t('label.diastolic')}
              width={100}
              min={schema.properties?.['diastolic']?.minimum ?? 0}
              max={
                schema.properties?.['diastolic']?.maximum ??
                NumUtils.MAX_SAFE_API_INTEGER
              }
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
