import React, { FC } from 'react';
import {
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useResponse } from '../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { RelatedDocumentsSection } from './RelatedDocumentsSection';
import { ProgramInfoSection } from './ProgramInfoSection';

export const SidePanel: FC = () => {
  const { success } = useNotification();
  const t = useTranslation();
  const { data } = useResponse.document.get();

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 4) ?? '')
      .then(() => success('Copied to clipboard successfully')());
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
      <ProgramInfoSection />
      <AdditionalInfoSection />
      <RelatedDocumentsSection />
    </DetailPanelPortal>
  );
};
