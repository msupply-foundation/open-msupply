import React, { FC, useEffect, useState } from 'react';
import {
  useTranslation,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useDebounceCallback,
  useBreadcrumbs,
  useFormatDateTime,
  Breadcrumb,
  useIntlUtils,
  ContactTraceNodeStatus,
} from '@openmsupply-client/common';
import {
  useJsonForms,
  useContactTraces,
  ContactTraceRowFragment,
  useDocumentRegistry,
  SchemaData,
} from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { PatientTabValue } from '../../Patient/PatientView/PatientView';
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
const useContactTraceData = (
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
    if (!!createType) {
      return;
    }
    if (!contactTraces) {
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

export type DetailViewProps = {
  createPatientId: string | null;
  createType: string | null;
};

export const DetailView: FC<DetailViewProps> = ({
  createType,
  createPatientId,
}) => {
  const t = useTranslation('dispensary');
  const navigate = useNavigate();
  const { setSuffix } = useBreadcrumbs([AppRoute.ContactTrace]);
  const dateFormat = useFormatDateTime();
  const { getLocalisedFullName } = useIntlUtils();
  const id = useContactTraces.utils.idFromUrl();
  const { data: contactData, isLoading } = useContactTraceData(
    id,
    createType,
    createPatientId
  );
  // Used when creating a new contact trace:
  const [newContactTraceId, setNewContactTraceId] = useState(id);

  const handleSave = useContactTraces.document.upsertDocument(
    contactData?.patient?.id ?? '',
    contactData?.type ?? '',
    contactTrace => {
      if (contactTrace.id !== id) setNewContactTraceId(contactTrace.id);
    }
  );

  const {
    JsonForm,
    data,
    setData,
    saveData,
    isDirty,
    validationError,
    revert,
  } = useJsonForms(
    contactData?.documentName,
    contactData?.patient?.id,
    {
      handleSave,
    },
    createType && contactData?.schema
      ? {
          data: contactData?.contactTrace,
          schema: contactData?.schema,
          isCreating: newContactTraceId === id,
        }
      : undefined
  );

  // When a contact trace id changes (contact trace has been created), wait till the isDirty flag
  // is cleared and then navigate to the correct url.
  useEffect(() => {
    if (!isDirty && newContactTraceId !== id) {
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.ContactTrace)
          .addPart(newContactTraceId)
          .build()
      );
    }
  }, [isDirty, newContactTraceId]);

  const updateContactTrace = useDebounceCallback(
    (patch: Partial<ContactTrace>) =>
      setData({
        ...(typeof data === 'object' ? data : {}),
        ...patch,
      }),
    [data, setData]
  );

  useEffect(() => {
    if (contactData) {
      setSuffix(
        <span key="patient-contact-trace">
          <Breadcrumb
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Patients)
              .addPart(contactData.patient.id)
              .addQuery({ tab: PatientTabValue.ContactTraces })
              .build()}
          >
            {getLocalisedFullName(
              contactData.patient?.firstName,
              contactData.patient?.lastName
            )}
          </Breadcrumb>
          <span>{` / ${contactData.programName} - ${dateFormat.localisedDate(
            contactData.contactTrace.datetime
          )}`}</span>
        </span>
      );
    }
  }, [contactData]);

  if (isLoading) return <DetailViewSkeleton />;

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      <link rel="stylesheet" href="/medical-icons.css" media="all"></link>
      {contactData && (
        <Toolbar onChange={updateContactTrace} data={contactData} />
      )}
      {!isLoading ? (
        JsonForm
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Dispensary)
                .addPart(AppRoute.ContactTrace)
                .build()
            )
          }
          title={t('error.encounter-not-found')}
          message={t('messages.click-to-return-to-contact-traces')}
        />
      )}

      <Footer
        documentName={contactData?.documentName}
        onSave={saveData}
        onCancel={revert}
        isDisabled={!isDirty || !!validationError}
        contactTrace={data as ContactTraceRowFragment}
      />
    </React.Suspense>
  );
};
