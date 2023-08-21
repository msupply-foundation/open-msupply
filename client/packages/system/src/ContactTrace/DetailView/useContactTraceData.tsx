import { useEffect, useState } from 'react';

import { ContactTraceNodeStatus } from '@common/types';
import {
  SchemaData,
  useContactTraces,
  useDocumentRegistry,
} from '@openmsupply-client/programs';
import { usePatient } from '../../Patient';

export type ContactTrace = {
  status: ContactTraceNodeStatus;
  datetime: string;
};

export type ContactTraceData = {
  id?: string;
  type: string;
  documentName?: string;
  contactTrace: ContactTrace;
  patient: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  schema?: SchemaData;
  programName: string;
};

/**
 * Hook to provide all data needed for the DetailView.
 * The data is either loaded from an existing contact trace otherwise some default data is returned.
 */
export const useContactTraceData = (
  traceId: string,
  createType: string | null,
  createPatientId: string | null
): { data: ContactTraceData | undefined; isLoading: boolean } => {
  const [result, setResult] = useState<{
    data: ContactTraceData | undefined;
    isLoading: boolean;
  }>({ data: undefined, isLoading: true });
  const [creationDate] = useState(new Date());
  const { data: contactTraces, isLoading } = useContactTraces.document.list(
    { filterBy: { id: { equalTo: traceId } } },
    !createType
  );

  const { data: patient, isLoading: isLoadingPatient } =
    usePatient.document.get(createPatientId ?? undefined);
  const { data: registries, isLoading: isLoadingRegistry } =
    useDocumentRegistry.get.documentRegistries({
      filter: { documentType: { equalTo: createType } },
    });
  // existing trace:
  useEffect(() => {
    if (!!createType || !contactTraces) {
      return;
    }

    const contactTrace = contactTraces?.nodes?.[0];
    const data: ContactTraceData | undefined = contactTrace
      ? {
          id: contactTrace.id,
          type: contactTrace.document.type,
          documentName: contactTrace.document.name,
          contactTrace: {
            status: contactTrace.status,
            datetime: contactTrace.datetime,
          },
          schema: undefined,
          patient: contactTrace.patient ?? undefined,
          programName: contactTrace.program.name,
        }
      : undefined;
    setResult({ data, isLoading });
  }, [contactTraces]);

  // create
  useEffect(() => {
    if (!createType) {
      return;
    }
    if (isLoadingPatient || isLoadingRegistry) {
      setResult({ data: undefined, isLoading: true });
      return;
    }
    const registry = registries?.nodes?.[0];
    if (!patient || !registry) {
      setResult({ data: undefined, isLoading: false });
      return;
    }

    setResult({
      data: {
        id: undefined,
        type: createType,
        documentName: undefined,
        contactTrace: {
          status: ContactTraceNodeStatus.Pending,
          datetime: creationDate.toISOString(),
        },
        schema: registry,
        patient,
        programName: registry.name ?? '',
      },
      isLoading: false,
    });
  }, [registries, isLoadingPatient, isLoadingRegistry]);

  return result;
};
