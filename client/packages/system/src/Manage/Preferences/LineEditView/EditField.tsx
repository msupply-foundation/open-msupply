import React, { useState } from 'react';
import { JsonData, JsonForm } from '@openmsupply-client/programs';
import { PreferenceDescriptionNode } from '@openmsupply-client/common';

export const EditField = ({
  value,
  preference,
  onChange,
}: {
  value: string | undefined;
  preference: PreferenceDescriptionNode;
  onChange: (newVal: JsonData) => void;
}) => {
  const defaultValue = parse(preference.serialisedDefault);
  const initialValue = value ? parse(value) : defaultValue;

  const [state, setState] = useState(initialValue);

  const updateData = (newData: JsonData) => {
    const newValue = (newData as { value: JsonData })?.value;
    if (newValue === undefined) {
      console.error('Invalid data', newData);
      return;
    }

    if (newValue !== initialValue && newValue !== state) {
      setState(newValue);
      onChange(newValue);
    }
  };

  return (
    <JsonForm
      data={{ value: state }}
      jsonSchema={preference.jsonSchema}
      uiSchema={preference.uiSchema}
      isError={false}
      isLoading={false}
      updateData={updateData}
    />
  );
};

const parse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};
