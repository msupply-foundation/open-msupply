import React, { useState } from 'react';
import { JsonForms } from '@jsonforms/react';
import {
  materialRenderers,
  materialCells,
} from '@jsonforms/material-renderers';
import {
  stringTester,
  TextField,
  selectTester,
  Selector,
  groupTester,
  Group,
  labelTester,
  Label,
  dateTester,
  Date,
  arrayTester,
  Array,
} from './components';
import customTester from './testers/testers';

import patient from './jsonTemp/patient_1.json';
import schema from './jsonTemp/schema.json';
import uiSchema from './jsonTemp/ui-schema.json';

const FormComponent = ({ data, setData, renderers }: any) => {
  return (
    <JsonForms
      schema={schema}
      uischema={uiSchema}
      data={data}
      renderers={renderers}
      // cells={materialCells}
      onChange={({ errors, data }) => {
        setData(data);
      }}
    />
  );
};

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

  const renderers = [
    ...materialRenderers,
    { tester: stringTester, renderer: TextField },
    { tester: selectTester, renderer: Selector },
    { tester: groupTester, renderer: Group },
    { tester: labelTester, renderer: Label },
    { tester: dateTester, renderer: Date },
    { tester: arrayTester, renderer: Array },
  ];

  return {
    JsonForm: (
      <FormComponent data={data} setData={setData} renderers={renderers} />
    ),
    saveData,
    loading,
    error,
  };
};
