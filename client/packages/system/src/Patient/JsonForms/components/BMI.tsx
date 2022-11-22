import React, { useEffect } from 'react';
import {
  composePaths,
  ControlProps,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  FORM_LABEL_WIDTH,
  NumUtils,
} from '@openmsupply-client/common';

export const bmiTester = rankWith(10, uiTypeIs('BMI'));

const round = (value: number) => Math.round(value * 100) / 100;

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path } = props;
  const { height, weight } = data ?? {};

  useEffect(() => {
    if (!data) return;

    const h = NumUtils.parseString(height);
    const w = NumUtils.parseString(weight);

    if (!handleChange || !w) return;

    const bmi = round(w / (h * h));
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
    />
  );
};

export const BMI = withJsonFormsControlProps(UIComponent);
