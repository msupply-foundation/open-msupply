import { useDocument } from '@openmsupply-client/programs/src/api';
import { DocumentRegistryFragment } from '@openmsupply-client/programs/src/api/operations.generated';
import { useEffect, useState } from 'react';
import { JsonData, JsonSchema, UISchemaElement } from './common';

export interface DocumentRegistry {
  formSchemaId: string;
  jsonSchema: JsonSchema;
  uiSchema: UISchemaElement;
}

/**
 * Information required to create a new document
 */
export interface CreateDocument {
  data: JsonData;
  documentRegistry: DocumentRegistryFragment;
}

export interface DocumentDataResponse {
  isLoading: boolean;
  error?: string;
  documentId?: string;
  data?: JsonData;
  documentRegistry?: DocumentRegistry;
}

// eslint-disable-next-line valid-jsdoc
/**
 * Manages the document data for a JSON form.
 * Data is taken either:
 * - from an api call (if the document already exist)
 * - from the createDoc (if the document is going to be created)
 */
export const useDocumentLoader = (
  docName: string | undefined,
  createDoc?: CreateDocument
): DocumentDataResponse => {
  const [error, setError] = useState<string | undefined>();
  // the current document id (undefined if its a new document)
  const [documentId, setDocumentId] = useState<string | undefined>();
  const [documentRegistry, setDocumentRegistry] = useState<DocumentRegistry>({
    formSchemaId: '',
    jsonSchema: {},
    uiSchema: { type: 'VerticalLayout' },
  });

  // fetch document (only if there is as document name)
  const {
    data: databaseResponse,
    isLoading,
    isError,
  } = useDocument.get.document(docName ?? '', !!docName);

  useEffect(() => {
    if (isError) {
      setError(`Failed to load document ${docName}`);
    }
  }, [isError]);

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
      setDocumentRegistry(documentRegistry);
    }
  }, [databaseResponse]);

  // user createDoc if there is one
  useEffect(() => {
    if (createDoc) {
      setDocumentRegistry(createDoc.documentRegistry);
    }
  }, [createDoc]);

  return {
    isLoading,
    error,
    documentId,
    data: createDoc?.data ?? databaseResponse?.data,
    documentRegistry,
  };
};
