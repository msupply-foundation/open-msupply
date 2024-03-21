import React, { memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  useTranslation,
  InfoTooltipIcon,
  useBufferState,
  ColorSelectButton,
  BufferedTextArea,
} from '@openmsupply-client/common';
import { InboundReturnFragment, useReturns } from '../../api';

export const AdditionalInfoSectionComponent = () => {
  const t = useTranslation('distribution');
  const { mutateAsync } = useReturns.document.updateInboundReturn();
  const isDisabled = useReturns.utils.inboundIsDisabled();

  const { data } = useReturns.document.inboundReturn();
  const { user, colour, comment, id } = data || {};

  const [bufferedColor, setBufferedColor] = useBufferState(colour);

  const update = (data: Partial<InboundReturnFragment>) => {
    if (!id) return;
    mutateAsync({ id, ...data });
  };

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.edited-by')}</PanelLabel>
          <PanelField>{user?.username}</PanelField>
          {user?.email ? <InfoTooltipIcon title={user?.email} /> : null}
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
          value={comment || ''}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const AdditionalInfoSection = memo(AdditionalInfoSectionComponent);
