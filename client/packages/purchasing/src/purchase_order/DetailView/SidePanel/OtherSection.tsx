import React, { ReactElement } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  TextArea,
} from '@openmsupply-client/common';
import { DonorSearchInput } from '@openmsupply-client/system/src';
import { PurchaseOrderFragment } from '../../api';

// TODO: ShippingMethod have its own table. Need to migrate over before implementing this

interface OtherSectionProps {
  draft?: PurchaseOrderFragment;
  onDraftChange: (input: Partial<PurchaseOrderFragment>) => void;
  onUpdate: (input: Partial<PurchaseOrderFragment>) => void;
  onDebounceUpdate: (input: Partial<PurchaseOrderFragment>) => void;
}

export const OtherSection = ({
  draft,
  onDraftChange,
  onUpdate,
  onDebounceUpdate,
}: OtherSectionProps): ReactElement => {
  const t = useTranslation();

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
          />
        </PanelRow>
        {/* <PanelRow>
          <PanelLabel>{t('label.shipping-method')}</PanelLabel> 
        </PanelRow> */}
        <PanelLabel>{t('label.comment')}</PanelLabel>
        <TextArea
          fullWidth
          value={draft?.comment ?? ''}
          onChange={e => {
            const value = e.target.value;
            onDraftChange({ comment: value });
            onDebounceUpdate({ comment: value });
          }}
          slotProps={{
            input: { sx: { backgroundColor: 'background.paper' } },
          }}
        />
      </Grid>
    </DetailPanelSection>
  );
};
