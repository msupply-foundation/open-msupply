import React, { useEffect, useState } from 'react';
import { JsonForms } from '@jsonforms/react';
import { materialRenderers } from '@jsonforms/material-renderers';
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

// Temporarily hard-coded examples until we connect to database
import patient from './jsonTemp/patient_1.json';
import schema from './jsonTemp/schema.json';
import uiSchema from './jsonTemp/ui-schema.json';
import { JsonFormsRendererRegistryEntry } from '@jsonforms/core';

export type JsonData = {
  [key: string]: string | number | boolean | null | unknown | JsonData;
};

interface JsonFormsComponentProps {
  data: JsonData;
  setData: (data: JsonData) => void;
  renderers: JsonFormsRendererRegistryEntry[];
}

const FormComponent = ({
  data,
  setData,
  renderers,
}: JsonFormsComponentProps) => {
  return (
    <JsonForms
      schema={schema}
      uischema={uiSchema}
      data={data}
      renderers={renderers}
      // cells={materialCells}
      onChange={({ errors, data }) => {
        setData(data);
        if (errors && errors.length) console.warn('Errors: ', errors);
      }}
    />
  );
};

export const useJsonForms = (docName: string | undefined) => {
  const [data, setData] = useState<JsonData>(patient);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | false>(false);

  useEffect(() => {
    if (!docName) setError('No document associated with this record');
  }, []);

  const saveData = () => {
    setLoading(true);
    // Run mutation...
    // setData...
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
      <FormComponent
        data={data}
        setData={setData}
        // setError={setError}
        renderers={renderers}
      />
    ),
    saveData,
    loading,
    error,
  };
};
