import React, { useState } from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../styleConstants';

export const stringTester = rankWith(3, schemaTypeIs('string'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, description, errors } = props;
  const [localData, setLocalData] = useState<string>(data);
  const onChange = useDebounceCallback(
    (value: string) => handleChange(path, value),
    [path]
  );
  const error = !!errors;

  if (!props.visible) {
    return null;
  }
  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: localData,
        sx: { margin: 0.5, width: '100%' },
        onChange: e => {
          setLocalData(e.target.value);
          onChange(e.target.value);
        },
        disabled: !props.enabled,
        placeholder: description,
        error,
        helperText: errors,
        FormHelperTextProps: error
          ? { sx: { color: 'error.main' } }
          : undefined,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
    />
  );
};

export const TextField = withJsonFormsControlProps(UIComponent);
