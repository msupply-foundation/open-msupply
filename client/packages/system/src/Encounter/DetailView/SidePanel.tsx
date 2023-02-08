import React, { FC, useState, useEffect } from 'react';
import {
  CopyIcon,
  DetailPanelAction,
  DetailPanelSection,
  ColorSelectButton,
  Grid,
  PanelLabel,
  PanelField,
  PanelRow,
  DetailPanelPortal,
  useNotification,
  useTranslation,
  InfoTooltipIcon,
  TextArea,
} from '@openmsupply-client/common';
import { EncounterFragment, useEncounter } from 'packages/programs/src';
import { getClinicianName } from '../../Patient/Encounter';
import { useFormatDateTime } from '@openmsupply-client/common';
// import { useInbound } from '../../api';
// import { AdditionalInfoSection } from './AdditionalInfoSection';
// import { PricingSection } from './PricingSection';
// import { RelatedDocumentsSection } from './RelatedDocumentsSection';
// import { TransportSection } from './TransportSection';

interface SidePanelProps {
  encounter: EncounterFragment;
  onChange: (patch: Partial<EncounterFragment>) => void;
}

export const SidePanel: FC<SidePanelProps> = ({ encounter, onChange }) => {
  const [encounterNote, setEncounterNote] = useState('');
  const { success } = useNotification();
  const { localisedDate } = useFormatDateTime();
  const t = useTranslation('common');
  console.log('Encounter', encounter);
  const {
    data: otherEncounters,
    isError,
    isLoading,
  } = useEncounter.document.list({
    filterBy: { patientId: { equalTo: encounter.patient.id } },
    sortBy: {
      key: 'startDatetime',
      isDesc: false,
      direction: 'asc',
    },
  });

  return (
    <DetailPanelPortal>
      <DetailPanelSection title="Additional Info">
        <Grid container gap={0.5} key="additional-info">
          <PanelRow>
            <PanelLabel>{'Entered by:'}</PanelLabel>
            <PanelField>
              {getClinicianName(encounter.document.data.clinician)}
            </PanelField>
          </PanelRow>

          <PanelRow>
            <PanelLabel>{'Entered on:'}</PanelLabel>
            <PanelField>{localisedDate(encounter.startDatetime)}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{'Visit notes, other problems'}</PanelLabel>
          </PanelRow>
          <PanelRow>
            <PanelLabel>
              <TextArea
                value={encounterNote}
                onChange={e => setEncounterNote(e.target.value)}
              />
            </PanelLabel>
          </PanelRow>
        </Grid>
      </DetailPanelSection>
      <DetailPanelSection title="Previous encounters">
        {isError ? (
          <p>ERROR</p>
        ) : isLoading ? (
          <>LOading</>
        ) : (
          otherEncounters?.nodes
            .filter(encounter => encounter)
            .map(encounter => (
              <PanelRow key={encounter.id}>
                <PanelLabel>
                  {localisedDate(encounter.startDatetime)}
                </PanelLabel>
              </PanelRow>
            ))
        )}
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
