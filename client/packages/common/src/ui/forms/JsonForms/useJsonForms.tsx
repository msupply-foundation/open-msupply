import React, { useEffect, useState } from 'react';
import { RouteBuilder, useNavigate } from '@openmsupply-client/common';
import {
  Box,
  DialogButton,
  LoadingButton,
  useConfirmationModal,
  useTranslation,
  useNotification,
  useConfirmOnLeaving,
} from '@openmsupply-client/common';
import { JsonSchema, UISchemaElement } from '@jsonforms/core';

import { useDocument } from './api';
import { DocumentRegistryFragment } from './api/operations.generated';
import { JsonData, JsonForm } from './JsonForm';
import { AppRoute } from '@openmsupply-client/config';

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
  data: JsonData;
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

  const {
    showButtonPanel = true,
    onCancel = () => navigate(RouteBuilder.create(AppRoute.Patients).build()),
    saveConfirmationMessage = t('messages.confirm-save-generic'),
    cancelConfirmationMessage = t('messages.confirm-cancel-generic'),
    saveSuccessMessage = t('success.data-saved'),
  } = options;

  useConfirmOnLeaving(isDirty);

  const saveData = async () => {
    if (data === undefined) {
      return;
    }
    setSaving(true);

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

  const updateData = (newData: JsonData) => {
    setIsDirty(isDirty === undefined ? false : true);
    setData(newData);
  };

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
        onClick={() => showSaveConfirmation()}
        isLoading={saving}
        disabled={error !== false || isLoading || !isDirty}
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

  return {
    JsonForm: (
      <JsonForm
        data={data}
        documentRegistry={documentRegistry}
        isError={isError}
        isLoading={isLoading}
        setError={setError}
        updateData={updateData}
      >
        {showButtonPanel && <ButtonPanel />}
      </JsonForm>
    ),
    saveData,
    loading: isLoading,
    error,
  };
};
