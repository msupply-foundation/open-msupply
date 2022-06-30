import React, { useState } from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow } from '@openmsupply-client/common';

export const stringTester = rankWith(3, schemaTypeIs('string'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path } = props;
  const [localData, setLocalData] = useState<string>(data);
  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: localData,
        sx: { margin: 0.5, width: '100%' },
        onChange: e => {
          setLocalData(e.target.value);
        },
        onBlur: () => handleChange(path, localData),
        disabled: !props.enabled,
      }}
    />
  );
};

export const TextField = withJsonFormsControlProps(UIComponent);
