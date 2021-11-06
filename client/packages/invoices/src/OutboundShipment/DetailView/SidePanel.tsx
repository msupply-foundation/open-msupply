import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  TextArea,
  useNotification,
  useTranslation,
  ColorSelectButton,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { isInvoiceEditable } from '../utils';
import { OutboundShipment } from './types';

interface SidePanelProps {
  draft: OutboundShipment;
}

export const SidePanel: FC<SidePanelProps> = ({ draft }) => {
  const { success } = useNotification();
  const t = useTranslation();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(draft, null, 4) ?? '');
    success('Copied to clipboard successfully')();
  };

  return (
    <DetailPanelPortal
      Actions={
        <DetailPanelAction
          icon={<CopyIcon />}
          titleKey="link.copy-to-clipboard"
          onClick={copyToClipboard}
        />
      }
    >
      <DetailPanelSection titleKey="heading.additional-info">
        <Grid container gap={0.5} key="additional-info">
          <PanelRow>
            <PanelLabel>{t('label.entered-by')}</PanelLabel>
            <PanelField>{draft.enteredByName}</PanelField>
          </PanelRow>

          <PanelRow>
            <PanelLabel>{t('label.color')}</PanelLabel>
            <PanelField>
              <ColorSelectButton
                disabled={!isInvoiceEditable(draft)}
                onChange={color => draft.update?.('color', color.hex)}
                color={draft.color}
              />
            </PanelField>
          </PanelRow>
          <PanelLabel>{t('heading.comment')}</PanelLabel>
          <TextArea
            disabled={!isInvoiceEditable(draft)}
            onChange={e => draft.update?.('comment', e.target.value)}
            value={draft.comment}
          />
        </Grid>
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
