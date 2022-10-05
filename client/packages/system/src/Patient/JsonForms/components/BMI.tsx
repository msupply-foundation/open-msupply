import React, { useEffect, useState } from 'react';
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
  const [bmi, setBmi] = useState<number | null>(null);

  useEffect(() => {
    if (!data) return;

    const height = NumUtils.parseString(data.height);
    const weight = NumUtils.parseString(data.weight);

    if (!height || !weight) return;

    setBmi(round(weight / (height * height)));
  }, [data]);

  useEffect(() => {
    if (bmi === null) return;
    handleChange(composePaths(path, 'bodyMassIndex'), bmi);
  }, [bmi]);

  if (!props.visible) {
    return null;
  }

  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: data.bodyMassIndex ?? '',
        sx: { margin: 0.5, width: '100px' },
        disabled: true,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
    />
  );
};

export const BMI = withJsonFormsControlProps(UIComponent);
