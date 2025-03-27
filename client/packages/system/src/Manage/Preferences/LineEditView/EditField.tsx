import React, { useState } from 'react';
import { JsonData, JsonForm } from '@openmsupply-client/programs';

export const EditField = ({
  value,
  type,
  onChange,
}: {
  value: JsonData;
  type: string;
  onChange: (newVal: JsonData) => void;
}) => {
  const [state, setState] = useState(value);

  const updateData = (newData: JsonData) => {
    const newValue = (newData as { value: JsonData })?.value;
    if (newValue === undefined) {
      console.error('Invalid data', newData);
      return;
    }

    if (newValue !== value) {
      setState(newValue);
      onChange(newValue);
    }
  };

  return (
    <JsonForm
      data={{ value: state }}
      jsonSchema={{
        properties: { value: { type } },
      }}
      uiSchema={{ type: 'Control', scope: '#/properties/value' }}
      isError={false}
      isLoading={false}
      updateData={updateData}
    />
  );
};
