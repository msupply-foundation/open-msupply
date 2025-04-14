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
      // On most json form elements, we want the label at the start as
      // the input may span multiple lines. However, for a boolean field,
      // the input is a single line, so we want the label centred.
      sx={{ ...DefaultFormRowSx, alignItems: 'center !important' }}
      label={t(label as LocaleKey)}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
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
