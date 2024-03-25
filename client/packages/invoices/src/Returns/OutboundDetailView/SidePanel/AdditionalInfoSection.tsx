import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  BufferedTextArea,
  useTranslation,
  ColorSelectButton,
  InfoTooltipIcon,
} from '@openmsupply-client/common';
import { OutboundReturnFragment, useReturns } from '../../api';

export const AdditionalInfoSectionComponent: FC = () => {
  const t = useTranslation('replenishment');
  const { debouncedMutateAsync: debouncedUpdate } =
    useReturns.document.updateOutboundReturn();
  // const isDisabled = useReturns.utils.outboundIsDisabled();
  const isDisabled = false; // TODO

  const { bufferedState, setBufferedState } =
    useReturns.document.outboundReturn();
  const { user, colour, comment, id } = bufferedState || { id: '' };

  const onChange = (patch: Partial<OutboundReturnFragment>) => {
    setBufferedState(patch);
    debouncedUpdate({ id, ...patch });
  };

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          <PanelField>{user?.username}</PanelField>
          {user?.email ? <InfoTooltipIcon title={user?.email} /> : null}
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.color')}</PanelLabel>
          <PanelField>
            <ColorSelectButton
              disabled={isDisabled}
              onChange={color => onChange({ colour: color.hex })}
              color={colour}
            />
          </PanelField>
        </PanelRow>

        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => onChange({ comment: e.target.value })}
          value={comment}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const AdditionalInfoSection = memo(AdditionalInfoSectionComponent);
