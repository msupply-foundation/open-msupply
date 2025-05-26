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
  useToggle,
  IconButton,
  EditIcon,
  PreferenceKey,
  usePreference,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';
import { DonorEditModal } from '../modals';

export const AdditionalInfoSectionComponent = () => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();
  const { isOn: donorModalOn, toggleOff, toggleOn } = useToggle();

  const isDisabled = useInbound.utils.isDisabled();

  const { data: prefs } = usePreference(
    PreferenceKey.AllowTrackingOfStockByDonor
  );

  const { id, user, comment, colour, createdDatetime, defaultDonor, update } =
    useInbound.document.fields([
      'id',
      'comment',
      'colour',
      'user',
      'createdDatetime',
      'defaultDonor',
    ]);
  const [bufferedColor, setBufferedColor] = useBufferState(colour);

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        {prefs?.allowTrackingOfStockByDonor && (
          <>
            {donorModalOn && (
              <DonorEditModal
                invoiceId={id}
                donorId={defaultDonor?.id ?? ''}
                onClose={toggleOff}
                isOpen
              />
            )}
            <PanelRow>
              <PanelLabel>{t('heading.donor-name')}</PanelLabel>
              <PanelField>
                <IconButton
                  icon={<EditIcon style={{ fontSize: 16, fill: 'none' }} />}
                  label={t('label.edit')}
                  onClick={toggleOn}
                />
              </PanelField>
              <PanelField>
                {defaultDonor?.name ?? t('label.no-donor-selected')}
              </PanelField>
            </PanelRow>
          </>
        )}

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
