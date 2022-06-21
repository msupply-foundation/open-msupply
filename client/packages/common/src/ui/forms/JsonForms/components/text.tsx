import React from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow } from '@openmsupply-client/common';

export const stringTester = rankWith(3, schemaTypeIs('string'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, schema, uischema } = props;

  // console.log('Text data', data);
  // console.log('Text path', path);
  // console.log('Text schema', schema);
  // console.log('Text uischema', uischema);

  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: data,
        sx: { margin: 0.5, width: '100%' },
        onChange: e => handleChange(path, e.target.value),
      }}
    />
  );
};

export const TextField = withJsonFormsControlProps(UIComponent);
