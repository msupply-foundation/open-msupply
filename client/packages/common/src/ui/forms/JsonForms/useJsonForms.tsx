import React, { useState } from 'react';
import { JsonForms } from '@jsonforms/react';
import {
  materialRenderers,
  materialCells,
} from '@jsonforms/material-renderers';

import patient from './jsonTemp/patient_1.json';
import schema from './jsonTemp/schema.json';
import uiSchema from './jsonTemp/ui-schema.json';

export const useJsonForms = (docName: string) => {
  const [data, setData] = useState(patient);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const saveData = () => {
    setLoading(true);
    // Run mutation
    // Update data
    console.log('Saving data...');
    setLoading(false);
  };

  return {
    JsonForm: () => (
      <JsonForms
        schema={schema}
        uischema={uiSchema}
        data={data}
        renderers={materialRenderers}
        cells={materialCells}
        onChange={({ errors, data }) => setData(data)}
      />
    ),
    saveData,
    loading,
    error,
  };
};
