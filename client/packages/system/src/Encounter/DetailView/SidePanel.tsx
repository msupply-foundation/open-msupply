import React, { FC } from 'react';
import {
  CopyIcon,
  DetailPanelAction,
  DetailPanelSection,
  ColorSelectButton,
  Grid,
  PanelField,
  PanelLabel,
  PanelRow,
  DetailPanelPortal,
  useNotification,
  useTranslation,
  InfoTooltipIcon,
} from '@openmsupply-client/common';
import { EncounterFragment } from 'packages/programs/src';
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
  //   const { data } = useInbound.document.get();
  const { success } = useNotification();
  const t = useTranslation('common');
  console.log('Encounter', encounter);

  return (
    <DetailPanelPortal
    // Actions={
    //   <>
    //     <DetailPanelAction
    //       icon={<CopyIcon />}
    //       title={t('link.copy-to-clipboard')}
    //       onClick={() => {}}
    //     />
    //   </>
    // }
    >
      <DetailPanelSection title="Additional Info">
        <Grid container gap={0.5} key="additional-info">
          <PanelRow>
            <PanelLabel>{'Entered by:'}</PanelLabel>
            {/* <PanelField>{encounter.document.clinician.id}</PanelField> */}
          </PanelRow>

          <PanelRow>
            <PanelLabel>{t('label.color')}</PanelLabel>
            {/* <PanelField>
            <ColorSelectButton
              disabled={isDisabled}
              onChange={({ hex }) => {
                setBufferedColor(hex);
                update({ colour: hex });
              }}
              color={bufferedColor}
            />
          </PanelField> */}
          </PanelRow>

          <PanelLabel>{t('heading.comment')}</PanelLabel>
          {/* <BufferedTextArea
          disabled={isDisabled}
          onChange={e => update({ comment: e.target.value })}
          value={comment || ''}
        /> */}
        </Grid>
      </DetailPanelSection>
      <p>THis is a side panel</p>
      {/* <AdditionalInfoSection />
      <RelatedDocumentsSection />
      <PricingSection />
      {isTransfer && <TransportSection />} */}
    </DetailPanelPortal>
  );
};
