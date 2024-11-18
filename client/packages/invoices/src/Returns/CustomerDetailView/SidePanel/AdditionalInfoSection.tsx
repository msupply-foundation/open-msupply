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
import { CustomerReturnFragment, useReturns } from '../../api';

export const AdditionalInfoSectionComponent = () => {
  const t = useTranslation();
  const { debouncedMutateAsync } = useReturns.document.updateCustomerReturn();
  const isDisabled = useReturns.utils.customerIsDisabled();

  const { draft, setDraft } =
    useReturns.document.customerReturn();
  const { user, colour, comment, id } = draft || {};

  const update = (data: Partial<CustomerReturnFragment>) => {
    if (!id) return;
    setDraft({ ...data });
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
