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
} from '@openmsupply-client/common';
import { EncounterFragment, useEncounter } from '../api';

import { useJsonForms } from '../../Patient/JsonForms';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';

export const DetailView: FC = () => {
  const t = useTranslation('patients');
  const id = useEncounter.utils.id();
  const navigate = useNavigate();
  const { setSuffix } = useBreadcrumbs([AppRoute.Encounter]);
  const dateFormat = useFormatDateTime();

  const {
    data: encounter,
    mutate: fetchEncounter,
    isSuccess,
    isError,
  } = useEncounter.document.get();

  const handleSave = useEncounter.document.upsertDocument(
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
        `${
          encounter.document.documentRegistry?.name
        } - ${dateFormat.localisedDateTime(encounter.startDatetime)}`
      );
  }, [encounter]);

  if (!isSuccess && !isError) return <DetailViewSkeleton />;

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      <link rel="stylesheet" href="/medical-icons.css" media="all"></link>
      <Toolbar onChange={updateEncounter} />
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
      <Footer
        documentName={encounter?.document?.name}
        onSave={saveData}
        onCancel={revert}
        isDisabled={!isDirty || !!validationError}
      />
    </React.Suspense>
  );
};
