import React, { FC } from 'react';
import {
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useResponse } from '../api';
import { AdditionalInfoSection, PricingSectionComponent, ProgramInfoSection, RelatedDocumentsSection } from '../../common';

export const SidePanel: FC = () => {
  const { success } = useNotification();
  const t = useTranslation();
  const { data } = useResponse.document.get();

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
      <ProgramInfoSection {...useResponse.document.fields(['orderType', 'programName', 'period'])} />
      <AdditionalInfoSection
        isDisabled={useResponse.utils.isDisabled()}
        {...useResponse.document.fields(['colour', 'comment', 'createdDatetime', 'user'])}
      />
      <RelatedDocumentsSection {...useResponse.document.fields(['shipments'])} />
      <PricingSectionComponent {...useResponse.document.fields('lines')} />
    </DetailPanelPortal>
  );
};
