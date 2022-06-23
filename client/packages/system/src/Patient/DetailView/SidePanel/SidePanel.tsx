import React, { memo } from 'react';
import {
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useOutbound } from '../../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { PricingSection } from './PricingSection';
import { RelatedDocumentsSection } from './RelatedDocumentsSection';
import { TransportSection } from './TransportSection';

export const SidePanelComponent = () => {
  const { success } = useNotification();
  const t = useTranslation('distribution');
  const { data } = useOutbound.document.get();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 4) ?? '');
    success('Copied to clipboard successfully')();
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
      <RelatedDocumentsSection />
      <PricingSection />
      <TransportSection />
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
