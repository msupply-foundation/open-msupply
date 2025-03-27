import React from 'react';
import { rankWith, isBooleanControl, ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  Switch,
  DetailInputWithLabelRow,
  useTranslation,
  LocaleKey,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH, DefaultFormRowSx } from '../styleConstants';

export const booleanTester = rankWith(4, isBooleanControl);

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, enabled } = props;
  const t = useTranslation();

  if (!props.visible) {
    return null;
  }

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={t(label as LocaleKey)}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      labelProps={{ sx: { lineHeight: '2.5' } }}
      Input={
        <Switch
          labelPlacement="end"
          onChange={(_, checked) => {
            handleChange(path, checked);
          }}
          value={data ?? ''}
          checked={!!data}
          disabled={!enabled}
        />
      }
    />
  );
};

export const BooleanField = withJsonFormsControlProps(UIComponent);
