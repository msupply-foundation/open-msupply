import React, { FC } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  BufferedTextArea,
  useTranslation,
  ColorSelectButton,
  useBufferState,
} from '@openmsupply-client/common';
import { useInboundFields, useIsInboundDisabled } from '../../api';

export const AdditionalInfoSection: FC = () => {
  const { comment, colour, update } = useInboundFields(['comment', 'colour']);
  const isDisabled = useIsInboundDisabled();
  const t = useTranslation(['common', 'replenishment']);
  const [bufferedColor, setBufferedColor] = useBufferState(colour);

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.color')}</PanelLabel>
          <PanelField>
            <ColorSelectButton
              disabled={isDisabled}
              onChange={({ hex }) => {
                setBufferedColor(hex);
                update({ colour: hex });
              }}
              color={bufferedColor}
            />
          </PanelField>
        </PanelRow>

        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => update({ comment: e.target.value })}
          value={comment}
        />
      </Grid>
    </DetailPanelSection>
  );
};
