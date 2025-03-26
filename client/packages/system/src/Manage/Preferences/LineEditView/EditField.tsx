import React from 'react';
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
  const updateData = (newData: JsonData) => {
    const newValue = (newData as { value: JsonData })?.value;
    if (newValue === undefined) {
      console.log('Invalid data', newData);
      return;
    }

    if (newValue !== value) {
      onChange(newValue);
    }
  };

  return (
    <JsonForm
      data={{ value }}
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
