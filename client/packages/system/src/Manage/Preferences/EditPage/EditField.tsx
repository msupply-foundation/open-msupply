import React, { useState } from 'react';
import { JsonData, JsonForm } from '@openmsupply-client/programs';
import { Box, PreferenceDescriptionNode } from '@openmsupply-client/common';

export const EditField = ({
  value,
  config,
  onChange,
}: {
  value: JsonData | undefined;
  config: PreferenceDescriptionNode;
  message?: string;
  onChange: (newVal: JsonData) => void;
}) => {
  const [state, setState] = useState(value);

  const updateData = (newData: JsonData) => {
    const newValue = (newData as { value: JsonData })?.value;
    if (newValue === undefined) {
      console.error('Invalid data', newData);
      return;
    }

    if (newValue !== state) {
      // TODO: value and onchange to come from same place so only one call
      // (UI value updates immediately, but the API call is delayed)
      setState(newValue);
      onChange(newValue);
    }
  };

  return (
    <Box display="flex" justifyContent="space-between">
      <Box width={300}>
        <JsonForm
          data={{ value: state }}
          jsonSchema={config.jsonSchema}
          uiSchema={config.uiSchema}
          isError={false}
          isLoading={false}
          updateData={updateData}
        />
      </Box>
    </Box>
  );
};
