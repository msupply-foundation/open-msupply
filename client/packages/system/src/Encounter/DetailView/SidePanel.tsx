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
} from '@openmsupply-client/common';
import { EncounterFragment, useEncounter } from 'packages/programs/src';
import { getClinicianName } from '../../Patient/Encounter';
import { AppRoute } from 'packages/config/src';

interface SidePanelProps {
  encounter: EncounterFragment;
  onChange: (patch: Partial<EncounterFragment> & { note?: string }) => void;
}

export const SidePanel: FC<SidePanelProps> = ({ encounter, onChange }) => {
  const [encounterNote, setEncounterNote] = useState(
    encounter.document.data?.note ?? ''
  );
  const { localisedDate } = useFormatDateTime();
  const t = useTranslation('patients');

  const {
    data: otherEncounters,
    isError,
    isLoading,
  } = useEncounter.document.list({
    filterBy: {
      patientId: { equalTo: encounter.patient.id },
      id: { notEqualTo: encounter.id },
    },
    sortBy: {
      key: 'startDatetime',
      isDesc: true,
      direction: 'desc',
    },
    pagination: { first: 5 },
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
                    note: encounterNote ?? '',
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
          otherEncounters?.nodes
            .filter(encounter => encounter)
            .map(encounter => (
              <PanelRow key={encounter.id}>
                <PanelLabel>
                  <Link
                    to={RouteBuilder.create(AppRoute.Dispensary)
                      .addPart(AppRoute.Encounter)
                      .addPart(encounter.id)
                      .build()}
                  >
                    {localisedDate(encounter.startDatetime)}
                  </Link>
                </PanelLabel>
              </PanelRow>
            ))
        )}
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
