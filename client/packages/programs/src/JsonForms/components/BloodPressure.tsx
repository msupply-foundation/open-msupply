import React, { useEffect } from 'react';
import {
  ControlProps,
  composePaths,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core';
import {
  Box,
  DetailInputWithLabelRow,
  NumUtils,
  NumericTextInput,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../common';
import { withJsonFormsControlProps } from '@jsonforms/react';

export const bloodPressureTester = rankWith(10, uiTypeIs('BloodPressure'));

export const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, errors, schema } = props;
  const [systolic, setSystolic] = React.useState<number | undefined>(undefined);
  const [diastolic, setDiastolic] = React.useState<number | undefined>(
    undefined
  );
  const systolicPath = composePaths(path, 'systolic');
  const diastolicPath = composePaths(path, 'diastolic');

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
    error: !!errors,
    helperText: errors,
    min: schema.minimum ?? 0,
    max: schema.maximum ?? NumUtils.MAX_SAFE_API_INTEGER,
  };

  return (
    <DetailInputWithLabelRow
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      sx={{ paddingTop: 0.5 }}
      Input={
        <Box display="flex" flexDirection="row" paddingLeft={0.5}>
          <NumericTextInput
            onChange={onChangeSystolic}
            value={systolic}
            {...inputProps}
          />
          <Box mx={1}>/</Box>
          <NumericTextInput
            onChange={onChangeDiastolic}
            value={diastolic}
            {...inputProps}
          />
        </Box>
      }
    />
  );
};

export const BloodPressure = withJsonFormsControlProps(UIComponent);
