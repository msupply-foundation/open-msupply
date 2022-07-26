import React, { useEffect, useState } from 'react';
import {
  Typography,
  UnhappyMan,
  useNavigate,
} from '@openmsupply-client/common';
import {
  Box,
  DialogButton,
  LoadingButton,
  useConfirmationModal,
  useTranslation,
  useNotification,
  useConfirmOnLeaving,
  BasicSpinner,
} from '@openmsupply-client/common';
import { JsonForms } from '@jsonforms/react';
import {
  JsonFormsRendererRegistryEntry,
  JsonSchema,
  UISchemaElement,
} from '@jsonforms/core';
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
import { useDocument } from './api';
import { DocumentRegistryFragment } from './api/operations.generated';

export type JsonData = {
  [key: string]: string | number | boolean | null | unknown | JsonData;
};

interface JsonFormsComponentProps {
  data: JsonData;
  jsonSchema: JsonSchema;
  uiSchema: UISchemaElement;
  setData: (data: JsonData) => void;
  setError: (error: string | false) => void;
  renderers: JsonFormsRendererRegistryEntry[];
}

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

// Prevents Form window being loaded with the same scroll position as its parent
const ScrollFix = () => {
  useEffect(() => {
    document.getElementById('document-display')?.scrollIntoView();
  }, []);
  return null;
};

export type SavedDocument = {
  id: string;
  name: string;
  type: string;
};

export type SaveDocumentMutation = (
  jsonData: unknown,
  formSchemaId: string,
  parent?: string
) => Promise<SavedDocument>;

interface JsonFormOptions {
  showButtonPanel?: boolean;
  onCancel?: () => void;
  handleSave?: SaveDocumentMutation;
  saveConfirmationMessage?: string;
  cancelConfirmationMessage?: string;
  saveSuccessMessage?: string;
}

/**
 * Information required to create a new document
 */
export interface CreateDocument {
  data: any;
  documentRegistry: DocumentRegistryFragment;
}

export const useJsonForms = (
  docName: string | undefined,
  options: JsonFormOptions = {},
  createDoc?: CreateDocument
) => {
  const [data, setData] = useState<JsonData | undefined>();
  // the current document id (undefined if its a new document)
  const [documentId, setDocumentId] = useState<string | undefined>();
  // document name can change from the input parameter when creating a new document
  const [documentName, setDocumentName] = useState<string | undefined>(docName);

  const [documentRegistry, setDocumentRegistry] = useState<{
    formSchemaId: string;
    jsonSchema: JsonSchema;
    uiSchema: UISchemaElement;
  }>({
    formSchemaId: '',
    jsonSchema: {},
    uiSchema: { type: 'VerticalLayout' },
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | false>(false);
  const [isDirty, setIsDirty] = useState<boolean>();
  const t = useTranslation('common');
  const { success, error: errorNotification } = useNotification();
  const navigate = useNavigate();

  // fetch document (only if there is as document name)
  const {
    data: databaseResponse,
    isLoading,
    isError,
  } = useDocument.get.document(documentName ?? '', !!documentName);
  useEffect(() => {
    if (!databaseResponse) return;

    const { data, documentRegistry } = databaseResponse;
    if (!data) {
      setError('No document data');
    } else {
      setData(data);
      setDocumentId(databaseResponse.id);
    }

    if (!documentRegistry) {
      setError('No document registry entry');
    } else if (!documentRegistry.jsonSchema) {
      setError('No Json Schema');
    } else if (!documentRegistry.uiSchema) {
      setError('No UI Schema');
    } else {
      setDocumentRegistry(documentRegistry);
    }
  }, [databaseResponse]);

  // user createDoc if there is one
  useEffect(() => {
    if (createDoc) {
      setData(createDoc.data);
      setDocumentRegistry(createDoc.documentRegistry);
      setIsDirty(true);
    }
  }, [createDoc]);

  const {
    showButtonPanel = true,
    onCancel = () => navigate(-1),
    saveConfirmationMessage = t('messages.confirm-save-generic'),
    cancelConfirmationMessage = t('messages.confirm-cancel-generic'),
    saveSuccessMessage = t('success.data-saved'),
  } = options;

  useConfirmOnLeaving(isDirty);

  const updateData = (newData: JsonData) => {
    setIsDirty(isDirty === undefined ? false : true);
    setData(newData);
  };

  const saveData = async () => {
    if (data === undefined) {
      return;
    }
    setSaving(true);
    console.log('Saving data...');

    // Run mutation...
    try {
      const result = await options.handleSave?.(
        data,
        documentRegistry.formSchemaId,
        documentId
      );

      setDocumentName(result?.name);
      setIsDirty(false);

      const successSnack = success(saveSuccessMessage);
      successSnack();
    } catch (err) {
      const errorSnack = errorNotification(t('error.problem-saving'));
      errorSnack();
    } finally {
      setSaving(false);
    }
  };

  const renderers = [
    // We should be able to remove materialRenderers once we are sure we have custom components to cover all cases.
    ...materialRenderers,
    { tester: stringTester, renderer: TextField },
    { tester: selectTester, renderer: Selector },
    { tester: groupTester, renderer: Group },
    { tester: labelTester, renderer: Label },
    { tester: dateTester, renderer: Date },
    { tester: arrayTester, renderer: Array },
  ];

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: saveData,
    message: saveConfirmationMessage,
    title: t('heading.are-you-sure'),
  });

  const showCancelConfirmation = useConfirmationModal({
    onConfirm: onCancel,
    message: cancelConfirmationMessage,
    title: t('heading.are-you-sure'),
  });

  const ButtonPanel = () => (
    <Box id="button-panel" paddingBottom={5} display="flex" gap={5}>
      <LoadingButton
        onClick={() => {
          if (isDirty) showSaveConfirmation();
          else onCancel();
        }}
        isLoading={saving}
        disabled={error !== false || isLoading}
        color="secondary"
      >
        {t('button.save')}
      </LoadingButton>
      <DialogButton
        variant="cancel"
        disabled={isLoading}
        onClick={() => {
          if (isDirty) showCancelConfirmation();
          else onCancel();
        }}
      />
    </Box>
  );

  const JsonForm =
    //  isLoading || !!data ? (
    isError ? (
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
    ) : (
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
          <BasicSpinner />
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
        {showButtonPanel && <ButtonPanel />}
      </Box>
      // ) : (
    );

  return {
    JsonForm,
    saveData,
    loading: isLoading,
    error,
  };
};
