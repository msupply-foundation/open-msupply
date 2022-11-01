import React, { FC, PropsWithChildren, useEffect } from 'react';
import {
  Typography,
  UnhappyMan,
  useAuthContext,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import { Box, useTranslation, BasicSpinner } from '@openmsupply-client/common';
import { JsonForms } from '@jsonforms/react';
import {
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  UISchemaElement,
} from '@jsonforms/core';
import { ErrorObject } from '@jsonforms/core/node_modules/ajv';
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
  arrayTester,
  Array,
  FirstItemArray,
  firstItemArrayTester,
  CategorizationTabLayout,
  categorizationTabLayoutTester,
} from './components';
import {
  AccordionGroup,
  accordionGroupTester,
} from './components/AccordionGroup';
import { NumberField, numberTester } from './components/Number';
import { DateTime, datetimeTester } from './components/DateTime';

export type JsonType = string | number | boolean | null | undefined;

export type JsonData =
  | {
      [key: string]: JsonData;
    }
  | JsonType
  | Array<JsonData>;

interface JsonFormProps {
  data?: JsonData;
  config?: Record<string, JsonData>;
  jsonSchema: JsonSchema;
  uiSchema: UISchemaElement;
  isError: boolean;
  isLoading: boolean;
  setError?: (error: string | false) => void;
  updateData: (newData: JsonData) => void;
  /** Additional custom renders which will be added to the default renderers */
  additionalRenderers?: JsonFormsRendererRegistryEntry[];
}

interface JsonFormsComponentProps {
  data?: JsonData;
  jsonSchema: JsonSchema;
  uiSchema: UISchemaElement;
  setData: (data: JsonData) => void;
  setError?: (error: string | false) => void;
  renderers: JsonFormsRendererRegistryEntry[];
  config?: Record<string, JsonData>;
}

// Prevents Form window being loaded with the same scroll position as its parent
const ScrollFix = () => {
  useEffect(() => {
    document.getElementById('document-display')?.scrollIntoView();
  }, []);
  return null;
};

/** Config data to pass to all json form controls */
export type JsonFormsConfig = {
  store?: UserStoreNodeFragment;
  user?: {
    id: string;
    name: string;
  };
};

const FormComponent = ({
  data,
  jsonSchema,
  uiSchema,
  setData,
  setError,
  renderers,
  config,
}: JsonFormsComponentProps) => {
  const { user, store } = useAuthContext();
  const fullConfig: JsonFormsConfig = {
    store,
    user,
    ...config,
  };

  const mapErrors = (
    errors?: ErrorObject<string, Record<string, any>, unknown>[]
  ) =>
    errors?.map(error => {
      const { parentSchema, keyword } = error;
      const messages = parentSchema?.['messages'];
      // mutate the error object if a custom error has been defined
      // was unable to get ajv-errors to work correctly or
      // find an alternative to support custom error messages
      // the alternative is for the message `must match pattern "[complicated regex]"` to be shown
      // to use: add a `messages` prop to the schema object
      // with a property for the required keyword to override
      error.message = messages?.[keyword] ?? error.message;
      return error.message ?? '';
    });

  return !data ? null : (
    <JsonForms
      schema={jsonSchema}
      uischema={uiSchema}
      data={data}
      config={fullConfig}
      renderers={renderers}
      // cells={materialCells}
      onChange={({ errors, data }) => {
        setData(data);
        if (errors && errors.length) {
          setError?.(mapErrors(errors)?.join(', ') ?? '');
          console.warn('Errors: ', errors);
        } else {
          setError?.(false);
        }
      }}
    />
  );
};

const renderers = [
  { tester: booleanTester, renderer: BooleanField },
  { tester: stringTester, renderer: TextField },
  { tester: numberTester, renderer: NumberField },
  { tester: selectTester, renderer: Selector },
  { tester: groupTester, renderer: Group },
  { tester: accordionGroupTester, renderer: AccordionGroup },
  { tester: labelTester, renderer: Label },
  { tester: dateTester, renderer: Date },
  { tester: datetimeTester, renderer: DateTime },
  { tester: arrayTester, renderer: Array },
  { tester: firstItemArrayTester, renderer: FirstItemArray },
  { tester: categorizationTabLayoutTester, renderer: CategorizationTabLayout },
  // We should be able to remove materialRenderers once we are sure we have custom components to cover all cases.
  ...materialRenderers,
];

export const JsonForm: FC<PropsWithChildren<JsonFormProps>> = ({
  children,
  data,
  jsonSchema,
  uiSchema,
  isError,
  isLoading,
  setError,
  updateData,
  additionalRenderers,
  config,
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
      {isLoading ? (
        <BasicSpinner inline />
      ) : (
        <FormComponent
          data={data}
          jsonSchema={jsonSchema}
          uiSchema={uiSchema}
          setData={updateData}
          setError={setError}
          renderers={[...renderers, ...(additionalRenderers ?? [])]}
          config={config}
        />
      )}
      {children}
    </Box>
  );
};
