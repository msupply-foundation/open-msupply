import React, { memo } from 'react';
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
  InfoTooltipIcon,
  useFormatDateTime,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';

export const AdditionalInfoSectionComponent = () => {
  const { user, comment, colour, createdDatetime, update } =
    useInbound.document.fields([
      'comment',
      'colour',
      'user',
      'createdDatetime',
    ]);
  const isDisabled = useInbound.utils.isDisabled();
  const t = useTranslation(['common', 'replenishment']);
  const [bufferedColor, setBufferedColor] = useBufferState(colour);
  const { localisedDate } = useFormatDateTime();

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.edited-by')}</PanelLabel>
          <PanelField>{user?.username ?? UNDEFINED_STRING_VALUE}</PanelField>
          {user?.email ? <InfoTooltipIcon title={user?.email} /> : null}
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.created')}</PanelLabel>
          <PanelField>{localisedDate(createdDatetime)}</PanelField>
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
