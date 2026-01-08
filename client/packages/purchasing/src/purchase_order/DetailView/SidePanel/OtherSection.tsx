import React, { ReactElement } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  TextArea,
} from '@openmsupply-client/common';
import {
  DonorSearchInput,
  ShippingMethodSearchInput,
  useShippingMethod,
} from '@openmsupply-client/system';
import { PurchaseOrderFragment } from '../../api';

interface OtherSectionProps {
  draft?: PurchaseOrderFragment;
  onUpdate: (input: Partial<PurchaseOrderFragment>) => void;
  onChange: (input: Partial<PurchaseOrderFragment>) => void;
}

export const OtherSection = ({
  draft,
  onUpdate,
  onChange,
}: OtherSectionProps): ReactElement => {
  const t = useTranslation();
  const { data: shippingMethods } = useShippingMethod();

  const selectedShippingMethod =
    shippingMethods?.nodes.find(sm => sm.method === draft?.shippingMethod) ??
    null;

  return (
    <DetailPanelSection title={t('heading.other')}>
      <Grid container gap={1} key="other-section">
        <PanelRow
          sx={{
            '.MuiInputBase-root': {
              backgroundColor: 'white',
            },
          }}
        >
          <PanelLabel>{t('label.donor')}</PanelLabel>
          <DonorSearchInput
            donorId={draft?.donor?.id ?? null}
            onChange={donor => onUpdate({ donor: donor })}
            clearable
          />
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.shipping-method')}</PanelLabel>
          <ShippingMethodSearchInput
            value={selectedShippingMethod}
            onChange={shippingMethod => {
              onChange({ shippingMethod: shippingMethod?.method ?? null });
            }}
            width={250}
          />
        </PanelRow>
        <PanelLabel>{t('label.comment')}</PanelLabel>
        <TextArea
          fullWidth
          value={draft?.comment ?? ''}
          onChange={e => {
            const value = e.target.value;
            onChange({ comment: value });
          }}
          slotProps={{
            input: { sx: { backgroundColor: 'background.paper' } },
          }}
        />
      </Grid>
    </DetailPanelSection>
  );
};
