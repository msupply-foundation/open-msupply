import {
  useDocument,
  FormInputData,
  SchemaData,
  JsonFormData,
} from '@openmsupply-client/programs';
import { useEffect, useState } from 'react';

export type SavedDocument = {
  name: string;
};

export type SaveDocumentMutation = (
  jsonData: unknown,
  formSchemaId: string,
  parent?: string
) => Promise<SavedDocument>;

export type DocumentFormData = JsonFormData<SavedDocument>;

/**
 * Manages the document data for a JSON form.
 * Data is taken either:
 * - from an api call (if the document already exist)
 * - from the formInputData (e.g. if the document is going to be created)
 */
export const useDocumentDataAccessor = (
  docName: string | undefined,
  formInputData?: FormInputData,
  handleSave?: SaveDocumentMutation
): DocumentFormData => {
  const [error, setError] = useState<string | undefined>();
  // the current document id (undefined if its a new document)
  const [documentId, setDocumentId] = useState<string | undefined>();
  const [schema, setSchema] = useState<SchemaData>({
    formSchemaId: '',
    jsonSchema: {},
    uiSchema: { type: 'VerticalLayout' },
  });

  // fetch document (only if there is as document name)
  const {
    data: databaseResponse,
    isLoading,
    isError,
  } = useDocument.get.documentByName(docName);

  useEffect(() => {
    if (isError) {
      setError(`Failed to load document ${docName}`);
    }
  }, [docName, isError]);

  useEffect(() => {
    if (!databaseResponse) return;

    const { data, documentRegistry } = databaseResponse;
    if (!data) {
      setError('No document data');
    } else {
      setDocumentId(databaseResponse.id);
    }

    if (!documentRegistry) {
      setError('No document registry entry');
    } else if (!documentRegistry.jsonSchema) {
      setError('No Json Schema');
    } else if (!documentRegistry.uiSchema) {
      setError('No UI Schema');
    } else {
      setSchema(documentRegistry);
    }
  }, [databaseResponse]);

  // use schema from the formInputData if there is one
  useEffect(() => {
    if (formInputData) {
      setSchema(formInputData.schema);
    }
  }, [formInputData]);

  return {
    isLoading,
    error,
    loadedData: formInputData?.data ?? databaseResponse?.data,
    isCreating: formInputData?.isCreating ?? false,
    schema,
    save: handleSave
      ? async (data: unknown) => {
          return await handleSave(data, schema.formSchemaId ?? '', documentId);
        }
      : undefined,
  };
};
