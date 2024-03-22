import React, { FC, memo, useEffect, useState } from 'react';
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
import { useReturns } from '../../api';

export const AdditionalInfoSectionComponent: FC = () => {
  const t = useTranslation('replenishment');
  const { debouncedMutateAsync: update } =
    useReturns.document.updateOutboundReturn();
  // const isDisabled = useReturns.utils.outboundIsDisabled();
  const isDisabled = false; // TODO

  const { data, isFetched } = useReturns.document.outboundReturn();
  const { user, id } = data || { id: '' };

  const [colorBuffer, setColorBuffer] = useState('');
  const [commentBuffer, setCommentBuffer] = useState('');
  useEffect(() => {
    setColorBuffer(data?.colour ?? '');
    setCommentBuffer(data?.comment ?? '');
  }, [isFetched]);

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
              onChange={color => {
                setColorBuffer(color.hex);
                update({ id, colour: color.hex });
              }}
              color={colorBuffer}
            />
          </PanelField>
        </PanelRow>

        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => {
            setCommentBuffer(e.target.value);
            update({ id, comment: e.target.value });
          }}
          value={commentBuffer}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const AdditionalInfoSection = memo(AdditionalInfoSectionComponent);
