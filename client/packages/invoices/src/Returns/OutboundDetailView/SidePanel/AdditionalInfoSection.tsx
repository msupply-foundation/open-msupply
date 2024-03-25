import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  //   BufferedTextArea,
  useTranslation,
  //   ColorSelectButton,
  //   useBufferState,
  InfoTooltipIcon,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const AdditionalInfoSectionComponent: FC = () => {
  const t = useTranslation('replenishment');
  const { data } = useReturns.document.outboundReturn();
  // const isDisabled = useReturns.utils.outboundIsDisabled();

  //   const { colour, comment, user, update } = useOutbound.document.fields([
  //     'colour',
  //     'comment',
  //     'user',
  //   ]);
  //   const [colorBuffer, setColorBuffer] = useBufferState(colour);
  //   const [commentBuffer, setCommentBuffer] = useBufferState(comment ?? '');

  //  TO-DO: Make this work
  const { user } = data || {};

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
            {/* <ColorSelectButton
              disabled={isDisabled}
              onChange={color => {
                setColorBuffer(color.hex);
                update({ colour: color.hex });
              }}
              color={colorBuffer}
            /> */}
          </PanelField>
        </PanelRow>

        {/* <PanelLabel>{t('heading.comment')}</PanelLabel> */}
        {/* <BufferedTextArea
          disabled={isDisabled}
          onChange={e => {
            setCommentBuffer(e.target.value);
            update({ comment: e.target.value });
          }}
          value={commentBuffer}
        /> */}
      </Grid>
    </DetailPanelSection>
  );
};

export const AdditionalInfoSection = memo(AdditionalInfoSectionComponent);
