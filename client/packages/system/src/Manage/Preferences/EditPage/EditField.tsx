import React, { useState } from 'react';
import { JsonData, JsonForm } from '@openmsupply-client/programs';
import {
  Box,
  PreferenceDescriptionNode,
  Typography,
} from '@openmsupply-client/common';

export const EditField = ({
  value,
  config,
  message,
  onChange,
}: {
  value: string | undefined;
  config: PreferenceDescriptionNode;
  message?: string;
  onChange: (newVal: JsonData) => void;
}) => {
  const defaultValue = parse(config.serialisedDefault);
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
      <Typography padding={1} fontStyle="italic" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

const parse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};
