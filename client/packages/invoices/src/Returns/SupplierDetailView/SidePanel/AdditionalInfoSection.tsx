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
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { SupplierReturnFragment, useReturns } from '../../api';

export const AdditionalInfoSectionComponent: FC = () => {
  const t = useTranslation();
  const { debouncedMutateAsync: debouncedUpdate } =
    useReturns.document.updateSupplierReturn();

  const isDisabled = useReturns.utils.supplierIsDisabled();

  const { bufferedState, setBufferedState } =
    useReturns.document.supplierReturn();
  const { user, colour, comment, id } = bufferedState || { id: '' };

  const onChange = (patch: Partial<SupplierReturnFragment>) => {
    setBufferedState(patch);
    debouncedUpdate({ id, ...patch });
  };

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          <PanelField>{user?.username ?? UNDEFINED_STRING_VALUE}</PanelField>
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
