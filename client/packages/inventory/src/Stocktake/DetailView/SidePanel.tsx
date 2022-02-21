import React, { FC } from 'react';

import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelLabel,
  BufferedTextArea,
  useBufferState,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import {
  useIsStocktakeDisabled,
  useStocktake,
  useStocktakeFields,
} from '../api';

const AdditionalInfoSection: FC = () => {
  const t = useTranslation('common');

  const { comment, update } = useStocktakeFields('comment');
  const [bufferedComment, setBufferedComment] = useBufferState(comment);
  const isDisabled = useIsStocktakeDisabled();

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => {
            setBufferedComment(e.target.value);
            update({ comment: e.target.value });
          }}
          value={bufferedComment}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC = () => {
  const { success } = useNotification();
  const t = useTranslation(['inventory', 'common']);
  const { data } = useStocktake();

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
