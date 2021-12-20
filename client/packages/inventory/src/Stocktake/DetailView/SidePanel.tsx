import React, { FC } from 'react';

import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelLabel,
  TextArea,
  useNotification,
  useTranslation,
  PanelRow,
  PanelField,
  useFormatDate,
} from '@openmsupply-client/common';
import { isStocktakeEditable } from '../../utils';
import { StocktakeController } from '../../types';

interface SidePanelProps {
  draft: StocktakeController;
}

const AdditionalInfoSection: FC<SidePanelProps> = ({ draft }) => {
  const t = useTranslation('common');
  const d = useFormatDate();

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          <PanelField>{draft.enteredByName}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.entered')}</PanelLabel>
          <PanelField>{d(new Date(draft.entryDatetime))}</PanelField>
        </PanelRow>
        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <TextArea
          disabled={!isStocktakeEditable(draft)}
          onChange={e => draft.update('comment', e.target.value)}
          value={draft.comment}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC<SidePanelProps> = ({ draft }) => {
  const { success } = useNotification();
  const t = useTranslation(['inventory', 'common']);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(draft, null, 4) ?? '');
    success('Copied to clipboard successfully')();
  };

  return (
    <DetailPanelPortal
      Actions={
        <>
          {!process.env['NODE_ENV'] ||
            (process.env['NODE_ENV'] === 'development' && (
              <DetailPanelAction
                icon={<CopyIcon />}
                title={t('dev.log-draft')}
                onClick={() => {
                  console.table(draft);
                  draft.lines.forEach(item => {
                    console.table(item);
                  });
                }}
              />
            ))}
          <DetailPanelAction
            icon={<CopyIcon />}
            title={t('link.copy-to-clipboard')}
            onClick={copyToClipboard}
          />
        </>
      }
    >
      <AdditionalInfoSection draft={draft} />
    </DetailPanelPortal>
  );
};
