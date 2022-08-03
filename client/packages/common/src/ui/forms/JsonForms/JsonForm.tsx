import React, { FC, PropsWithChildren, useEffect } from 'react';
import {
  DocumentRegistryFragment,
  Typography,
  UnhappyMan,
} from '@openmsupply-client/common';
import { Box, useTranslation, BasicSpinner } from '@openmsupply-client/common';
import { JsonForms } from '@jsonforms/react';
import {
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  UISchemaElement,
} from '@jsonforms/core';
import { materialRenderers } from '@jsonforms/material-renderers';
import {
  BooleanField,
  booleanTester,
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
  dateOfBirthTester,
  DateOfBirth,
  arrayTester,
  Array,
  FirstItemArray,
  firstItemArrayTester,
} from './components';

export type JsonData = {
  [key: string]: string | number | boolean | null | unknown | JsonData;
};

interface JsonFormProps {
  data?: JsonData;
  documentRegistry: Pick<
    DocumentRegistryFragment,
    'formSchemaId' | 'jsonSchema' | 'uiSchema'
  >;
  isError: boolean;
  isLoading: boolean;
  setError: (error: string | false) => void;
  updateData: (newData: JsonData) => void;
}

interface JsonFormsComponentProps {
  data: JsonData;
  jsonSchema: JsonSchema;
  uiSchema: UISchemaElement;
  setData: (data: JsonData) => void;
  setError: (error: string | false) => void;
  renderers: JsonFormsRendererRegistryEntry[];
}

// Prevents Form window being loaded with the same scroll position as its parent
const ScrollFix = () => {
  useEffect(() => {
    document.getElementById('document-display')?.scrollIntoView();
  }, []);
  return null;
};

const FormComponent = ({
  data,
  jsonSchema,
  uiSchema,
  setData,
  setError,
  renderers,
}: JsonFormsComponentProps) => {
  return (
    <JsonForms
      schema={jsonSchema}
      uischema={uiSchema}
      data={data}
      renderers={renderers}
      // cells={materialCells}
      onChange={({ errors, data }) => {
        setData(data);
        if (errors && errors.length) {
          setError(errors?.map(({ message }) => message ?? '').join(', '));
          console.warn('Errors: ', errors);
        } else {
          setError(false);
        }
      }}
    />
  );
};

const renderers = [
  // We should be able to remove materialRenderers once we are sure we have custom components to cover all cases.
  ...materialRenderers,
  { tester: booleanTester, renderer: BooleanField },
  { tester: stringTester, renderer: TextField },
  { tester: selectTester, renderer: Selector },
  { tester: groupTester, renderer: Group },
  { tester: labelTester, renderer: Label },
  { tester: dateTester, renderer: Date },
  { tester: dateOfBirthTester, renderer: DateOfBirth },
  { tester: arrayTester, renderer: Array },
  { tester: firstItemArrayTester, renderer: FirstItemArray },
];

export const JsonForm: FC<PropsWithChildren<JsonFormProps>> = ({
  children,
  data,
  documentRegistry,
  isError,
  isLoading,
  setError,
  updateData,
}) => {
  const t = useTranslation('common');

  if (isError)
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        width="100%"
        gap={2}
      >
        <UnhappyMan />
        <Typography color="error">{t('error.unable-to-load-data')}</Typography>
      </Box>
    );

  return (
    <Box
      id="document-display"
      display="flex"
      flexDirection="column"
      justifyContent={!data ? 'flex-end' : 'flex-start'}
      alignItems="center"
      width="100%"
      gap={2}
      paddingX={10}
    >
      <ScrollFix />
      {isLoading || !data ? (
        <BasicSpinner inline />
      ) : (
        <FormComponent
          data={data}
          jsonSchema={documentRegistry.jsonSchema}
          uiSchema={documentRegistry.uiSchema}
          setData={updateData}
          setError={setError}
          renderers={renderers}
        />
      )}
      {children}
    </Box>
  );
};
