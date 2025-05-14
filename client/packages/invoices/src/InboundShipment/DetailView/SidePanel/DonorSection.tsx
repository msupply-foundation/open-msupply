import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  PanelRow,
  useToggle,
  BufferedTextInput,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';
import { DonorEditModal } from '../modals/Donor/DonorEditModal';

export const DonorSectionComponent: FC = () => {
  const t = useTranslation();
  const { isOn, toggleOff } = useToggle();
  const { defaultDonorId, defaultDonor } = useInbound.document.fields([
    'defaultDonorId',
    'defaultDonor',
  ]);

  return (
    <>
      {isOn && (
        <DonorEditModal
          donorId={defaultDonorId ?? ''}
          isOpen={isOn}
          onClose={toggleOff}
        />
      )}
      <DetailPanelSection title={t('heading.invoice-donor')}>
        <Grid container gap={0.5} key="donor-details">
          <PanelRow>
            <PanelLabel display="flex" alignItems="center">
              {t('heading.reference')}
            </PanelLabel>
            <BufferedTextInput
              disabled={true}
              value={defaultDonor}
              slotProps={{
                input: {
                  style: {
                    backgroundColor: 'white',
                  },
                },
              }}
            />
          </PanelRow>
        </Grid>
      </DetailPanelSection>
    </>
  );
};

export const DonorSection = memo(DonorSectionComponent);
