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
  useFormatDate,
  ColorSelectButton,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { getStatusTranslation } from '../utils';
import { OutboundShipment } from './types';

interface SidePanelProps {
  draft: OutboundShipment;
}

export const SidePanel: FC<SidePanelProps> = ({ draft }) => {
  const { success } = useNotification();
  const t = useTranslation();
  const d = useFormatDate();

  // TODO: Extract to helper
  const entered = draft?.entryDatetime ? d(new Date(draft.entryDatetime)) : '-';

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
      <DetailPanelSection titleKey="heading.comment">
        <TextArea
          onChange={e => draft.update?.('comment', e.target.value)}
          value={draft.comment}
        />
      </DetailPanelSection>
      <DetailPanelSection titleKey="heading.additional-info">
        <Grid container key="additional-info">
          <PanelRow>
            <PanelLabel>{t('label.color')}</PanelLabel>
            <PanelField>
              <ColorSelectButton
                onChange={color => draft.update?.('color', color.hex)}
                color={draft.color}
              />
            </PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.entered')}</PanelLabel>
            <PanelField>{entered}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.status')}</PanelLabel>
            <PanelField>{t(getStatusTranslation(draft?.status))}</PanelField>
          </PanelRow>
        </Grid>
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
