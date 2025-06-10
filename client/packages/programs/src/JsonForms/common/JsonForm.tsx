import React, { FC, PropsWithChildren, useCallback, useEffect } from 'react';
import {
  LocaleKey,
  Typography,
  UnhappyMan,
  useAuthContext,
  useIntlUtils,
  UserStoreNodeFragment,
} from '@openmsupply-client/common';
import { Box, useTranslation, BasicSpinner } from '@openmsupply-client/common';
import { JsonForms, JsonFormsReactProps } from '@jsonforms/react';
import {
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  UISchemaElement,
  createAjv,
} from '@jsonforms/core';
import { materialRenderers } from '@jsonforms/material-renderers';
import {
  BooleanField,
  booleanTester,
  SortToggle,
  SortToggleTester,
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
  ArrayControl,
  notesTester,
  NotesControl,
  noteTester,
  Note,
  FirstItemArray,
  firstItemArrayTester,
  CategorizationTabLayout,
  categorizationTabLayoutTester,
  Autocomplete,
  autocompleteTester,
  conditionalSelectTester,
  ConditionalSelect,
  spacerTester,
  Spacer,
  keyedItemArrayTester,
  KeyedItemArray,
  ToolbarLayout,
  toolbarLayoutTester,
} from './components';
import {
  AccordionGroup,
  accordionGroupTester,
} from './components/AccordionGroup';
import { NumberField, numberTester } from './components/Number';
import { DateTime, datetimeTester } from './components/DateTime';
import { Header, headerTester } from './components/Header';
import {
  FORM_COLUMN_MAX_WIDTH,
  FORM_LABEL_COLUMN_WIDTH,
} from './styleConstants';
import { FormActionStructure } from '../useFormActions';

export type JsonType = string | number | boolean | null | undefined;

export type JsonData =
  | {
      [key: string]: JsonData;
    }
  | JsonType
  | Array<JsonData>;

interface JsonFormProps {
  data?: JsonData;
  config?: JsonFormsConfig & {
    formActions: FormActionStructure;
  };
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
  config?: JsonFormsConfig & {
    formActions: FormActionStructure;
  };
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
  /** Document name, if data is loaded from a document. */
  documentName?: string;
  patientId?: string;
  store?: UserStoreNodeFragment;
  user?: {
    id: string;
    name: string;
  };
  /**
   * The initial data of the form before doing any modifications.
   */
  initialData?: JsonData;
};

const FormComponent = ({
  data,
  jsonSchema,
  uiSchema,
  setData,
  setError,
  renderers,
  config,
  onChange,
}: JsonFormsComponentProps & JsonFormsReactProps) => {
  const t = useTranslation();
  const { currentLanguage } = useIntlUtils();
  const { user, store } = useAuthContext();
  const fullConfig: JsonFormsConfig = {
    store,
    user,
    ...config,
  };

  const mapErrors = (
    errors?: {
      keyword: string;
      parentSchema?: Record<string, Record<string, string>>;
      message?: string;
    }[]
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

  // This allows "default" values to be set in the JSON schema, though it
  // currently can't add defaults on nested properties unless a
  // default object is defined at the root level -- see issue #6971
  const handleDefaultsAjv = createAjv({ useDefaults: true });

  const translateError = useCallback(
    (error: {
      keyword: string;
      parentSchema?: Record<string, Record<string, string>>;
      message?: string;
    }) => {
      const { keyword, message } = error;
      const localeKey = `json-forms-error.${keyword}` as LocaleKey;
      // If a specific type of error is not defined in our localisations, just
      // return the default error message
      return t(localeKey, {
        defaultValue: message,
        parentSchema: error.parentSchema,
      });
    },
    [t]
  );

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
        onChange?.({ errors, data });
      }}
      ajv={handleDefaultsAjv}
      i18n={{ locale: currentLanguage, translateError }}
    />
  );
};

const renderers = [
  { tester: booleanTester, renderer: BooleanField },
  { tester: SortToggleTester, renderer: SortToggle },
  { tester: stringTester, renderer: TextField },
  { tester: numberTester, renderer: NumberField },
  { tester: selectTester, renderer: Selector },
  { tester: groupTester, renderer: Group },
  { tester: accordionGroupTester, renderer: AccordionGroup },
  { tester: labelTester, renderer: Label },
  { tester: dateTester, renderer: Date },
  { tester: datetimeTester, renderer: DateTime },
  { tester: arrayTester, renderer: ArrayControl },
  { tester: firstItemArrayTester, renderer: FirstItemArray },
  { tester: keyedItemArrayTester, renderer: KeyedItemArray },
  { tester: categorizationTabLayoutTester, renderer: CategorizationTabLayout },
  { tester: autocompleteTester, renderer: Autocomplete },
  { tester: conditionalSelectTester, renderer: ConditionalSelect },
  { tester: notesTester, renderer: NotesControl },
  { tester: noteTester, renderer: Note },
  { tester: spacerTester, renderer: Spacer },
  { tester: headerTester, renderer: Header },
  { tester: toolbarLayoutTester, renderer: ToolbarLayout },
  // We should be able to remove materialRenderers once we are sure we have custom components to cover all cases.
  ...materialRenderers,
];

export const JsonForm: FC<
  PropsWithChildren<JsonFormProps> & JsonFormsReactProps
> = ({
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
  onChange,
}) => {
  const t = useTranslation();

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
      paddingX={5}
      sx={{
        '& .input-with-label-row': {
          alignItems: 'flex-start',
          maxWidth: FORM_COLUMN_MAX_WIDTH,
          whiteSpace: 'nowrap',
        },
        '& h1, h2, h3, h4, h5, h6': {
          width: FORM_LABEL_COLUMN_WIDTH,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        },
        '&:empty': {
          display: 'none',
        },
      }}
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
          onChange={onChange}
        />
      )}
      {children}
    </Box>
  );
};
