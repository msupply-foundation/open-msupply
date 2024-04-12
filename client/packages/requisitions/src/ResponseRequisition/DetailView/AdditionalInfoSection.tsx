import React, { FC } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  PanelRow,
  PanelField,
  ColorSelectButton,
  useBufferState,
  BufferedTextArea,
  InfoTooltipIcon,
  useFormatDateTime,
} from '@openmsupply-client/common';
import { useResponse } from '../api';

export const AdditionalInfoSection: FC = () => {
  const isDisabled = useResponse.utils.isDisabled();
  const { user, colour, comment, createdDatetime, update } =
    useResponse.document.fields([
      'colour',
      'comment',
      'user',
      'createdDatetime',
    ]);
  const [bufferedColor, setBufferedColor] = useBufferState(colour);
  const { localisedDate } = useFormatDateTime();
  const t = useTranslation('distribution');

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.edited-by')}</PanelLabel>
          <PanelField>{user?.username}</PanelField>
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
              onChange={color => {
                setBufferedColor(color.hex);
                update({ colour: color.hex });
              }}
              color={bufferedColor ?? ''}
            />
          </PanelField>
        </PanelRow>
        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => update({ comment: e.target.value })}
          value={comment ?? ''}
        />
      </Grid>
    </DetailPanelSection>
  );
};
