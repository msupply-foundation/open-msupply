import React, { FC, memo } from 'react';
import {
  Grid,
  PanelLabel,
  useTranslation,
  useToggle,
  PanelRow,
  PanelField,
  EditIcon,
  IconButton,
  DetailPanelSection,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';
import { DonorEditModal } from '../modals/Donor/DonorEditModal';

export const DonorSectionComponent: FC = () => {
  const t = useTranslation();
  const { isOn, toggleOff, toggleOn } = useToggle();
  const { id, defaultDonorId, defaultDonor } = useInbound.document.fields([
    'id',
    'defaultDonorId',
    'defaultDonor',
  ]);

  return (
    <>
      {isOn && (
        <DonorEditModal
          invoiceId={id}
          donorId={defaultDonorId ?? ''}
          isOpen={isOn}
          onClose={toggleOff}
        />
      )}
      <DetailPanelSection title={t('heading.invoice-donor')}>
        <Grid container gap={0.5} key="donor-details">
          <PanelRow>
            {/* <PanelLabel display="flex" alignItems="center"> */}
            <PanelLabel>{t('heading.donor-name')}</PanelLabel>
            <PanelField>
              <IconButton
                disabled={false}
                icon={<EditIcon style={{ fontSize: 16, fill: 'none' }} />}
                label={t('label.edit')}
                onClick={toggleOn}
              />
            </PanelField>
            <PanelField>
              {defaultDonor ?? t('label.no-donor-selected')}
            </PanelField>
          </PanelRow>
        </Grid>
      </DetailPanelSection>
    </>
  );
};

export const DonorSection = memo(DonorSectionComponent);
