import React, { FC } from 'react';
import {
  useTranslation,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { EncounterFragment, useEncounter } from '../api';

import { useJsonForms } from '../../Patient/JsonForms';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';

export const DetailView: FC = () => {
  const t = useTranslation('patients');
  const { data: encounter, isLoading } = useEncounter.document.get();
  const navigate = useNavigate();

  const handleSave = useEncounter.document.upsert(
    encounter?.patient.id ?? '',
    '',
    encounter?.document.documentRegistry?.documentType ?? ''
  );

  const { JsonForm, saveData, isDirty, validationError, revert } = useJsonForms(
    encounter?.document?.name,
    {
      handleSave,
    }
  );

  const updateEncounter = useDebounceCallback(
    (patch: Partial<EncounterFragment>) =>
      handleSave?.(
        { ...encounter, ...patch },
        encounter?.document?.documentRegistry?.formSchemaId ?? '',
        encounter?.document.id ?? ''
      ),
    [encounter],
    1000
  );

  if (isLoading) return <DetailViewSkeleton />;

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
        onSave={saveData}
        onCancel={revert}
        isDisabled={!isDirty || !!validationError}
      />
    </React.Suspense>
  );
};
