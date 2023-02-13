import React, { FC, useState } from 'react';
import {
  DetailPanelSection,
  Grid,
  PanelLabel,
  PanelField,
  PanelRow,
  DetailPanelPortal,
  useTranslation,
  useFormatDateTime,
  TextArea,
  Link,
  RouteBuilder,
  InlineSpinner,
  useAuthContext,
} from '@openmsupply-client/common';
import { EncounterFragment, useEncounter } from 'packages/programs/src';
import { getClinicianName } from '../../Patient/Encounter';
import { AppRoute } from 'packages/config/src';

const NUM_RECENT_ENCOUNTERS = 5;

interface SidePanelProps {
  encounter: EncounterFragment;
  onChange: (
    patch: Partial<EncounterFragment> & {
      notes?: [
        { authorId?: string; authorName: string; created: string; text: string }
      ];
    }
  ) => void;
}

export const SidePanel: FC<SidePanelProps> = ({ encounter, onChange }) => {
  const [encounterNote, setEncounterNote] = useState(
    encounter.document.data?.notes?.[0]?.text ?? ''
  );
  const { user } = useAuthContext();
  const { localisedDate } = useFormatDateTime();
  const t = useTranslation('patients');

  const {
    data: otherEncounters,
    isError,
    isLoading,
  } = useEncounter.document.list({
    filterBy: {
      patientId: { equalTo: encounter.patient.id },
      type: { equalTo: encounter.type },
    },
    sortBy: {
      key: 'startDatetime',
      isDesc: true,
      direction: 'desc',
    },
    pagination: { first: NUM_RECENT_ENCOUNTERS },
  });

  return (
    <DetailPanelPortal>
      <DetailPanelSection title={t('label.additional-info')}>
        <Grid container gap={0.5} key="additional-info">
          <PanelRow>
            <PanelLabel>{t('label.clinician')}</PanelLabel>
            <PanelField>
              {getClinicianName(encounter.document.data.clinician)}
            </PanelField>
          </PanelRow>

          <PanelRow>
            <PanelLabel>{t('label.visit-date')}</PanelLabel>
            <PanelField>{localisedDate(encounter.startDatetime)}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.visit-notes')}</PanelLabel>
          </PanelRow>
          <PanelRow>
            <PanelLabel>
              <TextArea
                value={encounterNote}
                onChange={e => setEncounterNote(e.target.value)}
                onBlur={() =>
                  onChange({
                    notes: [
                      {
                        authorId: user?.id ?? '',
                        authorName: user?.name ?? '',
                        created: encounter.startDatetime,
                        text: encounterNote ?? '',
                      } ?? null,
                    ],
                  })
                }
              />
            </PanelLabel>
          </PanelRow>
        </Grid>
      </DetailPanelSection>
      <DetailPanelSection title={t('label.previous-encounters')}>
        {isError ? (
          ''
        ) : isLoading ? (
          <InlineSpinner />
        ) : (
          otherEncounters?.nodes.map(enc => (
            <PanelRow key={enc.id}>
              <PanelLabel>
                <Link
                  to={RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Encounter)
                    .addPart(enc.id)
                    .build()}
                  style={enc.id === encounter.id ? { fontWeight: 'bold' } : {}}
                >
                  {localisedDate(enc.startDatetime)}
                </Link>
              </PanelLabel>
            </PanelRow>
          ))
        )}
        {otherEncounters &&
        otherEncounters?.totalCount > NUM_RECENT_ENCOUNTERS ? (
          <PanelRow key={'more'}>
            <PanelLabel>
              <Link
                to={RouteBuilder.create(AppRoute.Dispensary)
                  .addPart(AppRoute.Patients)
                  .addPart(encounter.patient.id)
                  .addQuery({ tab: 'Encounters' })
                  .build()}
              >
                {t('label.more')}
              </Link>
            </PanelLabel>
          </PanelRow>
        ) : null}
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
