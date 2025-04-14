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
  useBufferState,
  InfoTooltipIcon,
  useFormatDateTime,
  UNDEFINED_STRING_VALUE,
  useDebouncedValueCallback,
} from '@openmsupply-client/common';
import { usePrescription } from '../../api';

export const AdditionalInfoSectionComponent: FC = () => {
  const t = useTranslation();
  const {
    query: { data },
    isDisabled,
    update: { update },
  } = usePrescription();
  const { colour, comment, user, createdDatetime } = data ?? {};
  const [colorBuffer, setColorBuffer] = useBufferState(colour);
  const [commentBuffer, setCommentBuffer] = useBufferState(comment ?? '');
  const { localisedDate } = useFormatDateTime();

  const debouncedUpdate = useDebouncedValueCallback(
    update,
    [commentBuffer],
    1500
  );

  if (!createdDatetime) return null;

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
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
              onChange={color => {
                setColorBuffer(color.hex);
                update({ colour: color.hex });
              }}
              color={colorBuffer}
            />
          </PanelField>
        </PanelRow>

        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          fullWidth
          disabled={isDisabled}
          onChange={e => {
            setCommentBuffer(e.target.value);
            debouncedUpdate({ comment: e.target.value });
          }}
          value={commentBuffer}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const AdditionalInfoSection = memo(AdditionalInfoSectionComponent);
