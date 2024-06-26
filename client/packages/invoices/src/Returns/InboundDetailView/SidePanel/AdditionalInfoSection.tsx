import React, { memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  useTranslation,
  InfoTooltipIcon,
  ColorSelectButton,
  BufferedTextArea,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { InboundReturnFragment, useReturns } from '../../api';

export const AdditionalInfoSectionComponent = () => {
  const t = useTranslation('distribution');
  const { debouncedMutateAsync } = useReturns.document.updateInboundReturn();
  const isDisabled = useReturns.utils.inboundIsDisabled();

  const { bufferedState, setBufferedState } =
    useReturns.document.inboundReturn();
  const { user, colour, comment, id } = bufferedState || {};

  const update = (data: Partial<InboundReturnFragment>) => {
    if (!id) return;
    setBufferedState({ ...data });
    debouncedMutateAsync({ id, ...data });
  };

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.edited-by')}</PanelLabel>
          <PanelField>{user?.username ?? UNDEFINED_STRING_VALUE}</PanelField>
          {user?.email ? <InfoTooltipIcon title={user?.email} /> : null}
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.color')}</PanelLabel>
          <PanelField>
            <ColorSelectButton
              disabled={isDisabled}
              onChange={({ hex }) => {
                update({ colour: hex });
              }}
              color={colour}
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
