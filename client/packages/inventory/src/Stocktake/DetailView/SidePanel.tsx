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
} from '@openmsupply-client/common';
import { isStocktakeEditable } from '../../utils';
import { StocktakeController } from '../../types';

interface SidePanelProps {
  draft: StocktakeController;
}

const AdditionalInfoSection: FC<SidePanelProps> = ({ draft }) => {
  const t = useTranslation('common');

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
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

const RelatedDocumentsSection: FC<SidePanelProps> = () => {
  const t = useTranslation(['common', 'distribution']);
  return (
    <DetailPanelSection
      title={t('heading.related-documents', { ns: 'distribution' })}
    >
      <Grid container gap={0.5} key="additional-info"></Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC<SidePanelProps> = ({ draft }) => {
  const { success } = useNotification();
  const t = useTranslation(['outbound-shipment', 'common']);

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
      <RelatedDocumentsSection draft={draft} />
    </DetailPanelPortal>
  );
};
