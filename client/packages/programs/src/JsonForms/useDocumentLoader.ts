import {
  useDocument,
  FormInputData,
  SchemaData,
} from '@openmsupply-client/programs';
import { useEffect, useState } from 'react';
import { JsonData } from './common';

export interface DocumentDataResponse {
  isLoading: boolean;
  error?: string;
  documentId?: string;
  data?: JsonData;
  schema?: SchemaData;
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
  createDoc?: FormInputData
): DocumentDataResponse => {
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
      setSchema(documentRegistry);
    }
  }, [databaseResponse]);

  // user createDoc if there is one
  useEffect(() => {
    if (createDoc) {
      setSchema(createDoc.schema);
    }
  }, [createDoc]);

  return {
    isLoading,
    error,
    documentId,
    data: createDoc?.data ?? databaseResponse?.data,
    schema,
  };
};
