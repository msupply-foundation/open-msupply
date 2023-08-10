import React, { FC, useEffect } from 'react';
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
} from '@openmsupply-client/common';
import {
  useJsonForms,
  useContactTraces,
  ContactTraceRowFragment,
} from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { PatientTabValue } from '../../Patient/PatientView/PatientView';

export const DetailView: FC = () => {
  const t = useTranslation('dispensary');
  const id = useContactTraces.utils.idFromUrl();
  const navigate = useNavigate();
  const { setSuffix } = useBreadcrumbs([AppRoute.ContactTrace]);
  const dateFormat = useFormatDateTime();
  const { getLocalisedFullName } = useIntlUtils();

  const {
    data: contactTraces,
    isSuccess,
    isError,
  } = useContactTraces.document.list({ filterBy: { id: { equalTo: id } } });

  const contactTrace = contactTraces?.nodes?.[0];
  const handleSave = useContactTraces.document.upsertDocument(
    contactTrace?.patientId ?? '',
    contactTrace?.document.type ?? ''
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
    contactTrace?.document?.name,
    contactTrace?.patientId,
    {
      handleSave,
    },
    undefined
  );

  const updateContactTrace = useDebounceCallback(
    (patch: Partial<ContactTraceRowFragment>) =>
      setData({
        ...(typeof data === 'object' ? data : {}),
        ...patch,
      }),
    [data, setData]
  );

  useEffect(() => {
    if (contactTrace) {
      setSuffix(
        <span key="patient-contact-trace">
          <Breadcrumb
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Patients)
              .addPart(contactTrace.patientId)
              .addQuery({ tab: PatientTabValue.ContactTraces })
              .build()}
          >
            {getLocalisedFullName(
              contactTrace.patient.firstName,
              contactTrace.patient.lastName
            )}
          </Breadcrumb>
          <span>{` / ${contactTrace.program?.name} - ${dateFormat.localisedDate(
            contactTrace.datetime
          )}`}</span>
        </span>
      );
    }
  }, [contactTrace]);

  if (!isSuccess && !isError) return <DetailViewSkeleton />;

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      <link rel="stylesheet" href="/medical-icons.css" media="all"></link>
      {contactTrace && (
        <Toolbar onChange={updateContactTrace} trace={contactTrace} />
      )}
      {contactTrace ? (
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
        documentName={contactTrace?.document?.name}
        onSave={saveData}
        onCancel={revert}
        isDisabled={!isDirty || !!validationError}
        contactTrace={data as ContactTraceRowFragment}
      />
    </React.Suspense>
  );
};
