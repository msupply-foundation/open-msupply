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
  EncounterNodeStatus,
} from '@openmsupply-client/common';
import {
  useEncounter,
  useJsonForms,
  EncounterFragment,
  useDocumentDataAccessor,
} from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { SidePanel } from './SidePanel';
import { AppBarButtons } from './AppBarButtons';
import { useLogicalStatus } from '../utils';

export const DetailView: FC = () => {
  const t = useTranslation('dispensary');
  const id = useEncounter.utils.idFromUrl();
  const navigate = useNavigate();
  const { setSuffix } = useBreadcrumbs([AppRoute.Encounter]);
  const dateFormat = useFormatDateTime();
  const { getLocalisedFullName } = useIntlUtils();
  const [logicalStatus, setLogicalStatus] = useState<string | undefined>(
    undefined
  );

  const {
    data: encounter,
    mutate: fetchEncounter,
    isSuccess,
    isError,
  } = useEncounter.document.byIdPromise(id);

  const handleSave = useEncounter.document.upsertDocument(
    encounter?.patient.id ?? '',
    encounter?.type ?? ''
  );

  const dataAccessor = useDocumentDataAccessor(
    encounter?.document?.name,
    undefined,
    handleSave
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
    {
      documentName: encounter?.document?.name,
      patientId: encounter?.patient?.id,
    },
    dataAccessor
  );

  const updateEncounter = useDebounceCallback(
    (patch: Partial<EncounterFragment>) =>
      setData({
        ...(typeof data === 'object' ? data : {}),
        ...patch,
      }),
    [data, setData]
  );

  // using a mutation to fetch rather than a query
  // because the API does not error on invalid ids
  // which results in an infinite re-render
  // if the id is invalid and a query is used
  useEffect(() => fetchEncounter(), [id]);

  useEffect(() => {
    if (encounter) {
      setSuffix(
        <span key="patient-encounter">
          <Breadcrumb
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Patients)
              .addPart(encounter.patient.id)
              .addQuery({ tab: 'Encounters' })
              .build()}
          >
            {getLocalisedFullName(
              encounter.patient.firstName,
              encounter.patient.lastName
            )}
          </Breadcrumb>
          <span>{` / ${encounter.document.documentRegistry
            ?.name} - ${dateFormat.localisedDate(
            encounter.startDatetime
          )}`}</span>
        </span>
      );

      if (encounter.status === EncounterNodeStatus.Pending) {
        const datetime = new Date(encounter.startDatetime);
        const status = useLogicalStatus(datetime, t);
        setLogicalStatus(status);
      }
    }
  }, [encounter]);

  if (!isSuccess && !isError) return <DetailViewSkeleton />;

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      <link rel="stylesheet" href="/medical-icons.css" media="all"></link>
      <AppBarButtons logicalStatus={logicalStatus} />
      {encounter && (
        <Toolbar onChange={updateEncounter} encounter={encounter} />
      )}
      {encounter ? (
        JsonForm
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Dispensary)
                .addPart(AppRoute.Encounter)
                .build()
            )
          }
          title={t('error.encounter-not-found')}
          message={t('messages.click-to-return-to-encounters')}
        />
      )}
      {encounter && (
        <SidePanel encounter={encounter} onChange={updateEncounter} />
      )}
      <Footer
        documentName={encounter?.document?.name}
        onSave={saveData}
        onCancel={revert}
        isDisabled={!isDirty || !!validationError}
        encounter={data as EncounterFragment}
      />
    </React.Suspense>
  );
};
