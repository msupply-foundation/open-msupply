import React, { memo } from 'react';
import {
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { usePrescription } from '../../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { PricingSection } from './PricingSection';

export const SidePanelComponent = () => {
  const { success } = useNotification();
  const t = useTranslation();
  const { data } = usePrescription.document.get();

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
  };

  return (
    <DetailPanelPortal
      Actions={
        <DetailPanelAction
          icon={<CopyIcon />}
          title={t('link.copy-to-clipboard')}
          onClick={copyToClipboard}
        />
      }
    >
      <AdditionalInfoSection />
      <PricingSection />
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
