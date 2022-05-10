import React, { FC } from 'react';
import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelLabel,
  BufferedTextArea,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useMasterList } from '../api';

const AdditionalInfoSection: FC = () => {
  const { description } = useMasterList.document.fields();
  const t = useTranslation('catalogue');

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea disabled={true} value={description ?? ''} />
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC = () => {
  const { data } = useMasterList.document.get();
  const { success } = useNotification();
  const t = useTranslation('catalogue');

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
    </DetailPanelPortal>
  );
};
