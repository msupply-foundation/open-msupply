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
} from '@openmsupply-client/common';
import {
  useEncounter,
  useJsonForms,
  EncounterFragment,
} from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { SidePanel } from './SidePanel';
import { AppBarButtons } from './AppBarButtons';

export const DetailView: FC = () => {
  const t = useTranslation('patients');
  const id = useEncounter.utils.idFromUrl();
  const navigate = useNavigate();
  const { setSuffix } = useBreadcrumbs([AppRoute.Encounter]);
  const dateFormat = useFormatDateTime();

  const {
    data: encounter,
    mutate: fetchEncounter,
    isSuccess,
    isError,
  } = useEncounter.document.byIdPromise(id);

  const handleSave = useEncounter.document.upsert(
    encounter?.patient.id ?? '',
    encounter?.program ?? '',
    encounter?.type ?? ''
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
    encounter?.document?.name,
    encounter?.patient?.id,
    {
      handleSave,
    },
    undefined
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
    if (encounter)
      setSuffix(
        <>
          <Breadcrumb
            to={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Patients)
              .addPart(encounter.patient.id)
              .build()}
            key={'part.key'}
          >
            {`${encounter.patient.firstName} ${encounter.patient.lastName}`}
          </Breadcrumb>
          {` / `}
          <span key={'part.key'}>{`${
            encounter.document.documentRegistry?.name
          } - ${dateFormat.localisedDateTime(encounter.startDatetime)}`}</span>
        </>
      );
  }, [encounter]);

  if (!isSuccess && !isError) return <DetailViewSkeleton />;

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      <link rel="stylesheet" href="/medical-icons.css" media="all"></link>
      <AppBarButtons />
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
      />
    </React.Suspense>
  );
};
