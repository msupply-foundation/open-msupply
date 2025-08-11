import React, { ReactElement } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  BufferedTextArea,
} from '@openmsupply-client/common';
import { DonorSearchInput } from '@openmsupply-client/system/src';
import { PurchaseOrderFragment } from '../../api';
import { UpdatePurchaseOrderInput } from '../../api/hooks/usePurchaseOrder';

// TODO: ShippingMethod have its own table. Need to migrate over before implementing this

interface OtherSectionProps {
  data?: PurchaseOrderFragment;
  onUpdate: (input: Partial<UpdatePurchaseOrderInput>) => void;
}

export const OtherSection = ({
  data,
  onUpdate,
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
            donorId={data?.donor?.id ?? null}
            onChange={donor => onUpdate({ donorId: donor?.id })}
          />
        </PanelRow>
        {/* <PanelRow>
          <PanelLabel>{t('label.shipping-method')}</PanelLabel> 
        </PanelRow> */}
        <PanelLabel>{t('label.comment')}</PanelLabel>
        <BufferedTextArea
          fullWidth
          value={data?.comment ?? ''}
          onChange={e => onUpdate({ comment: e.target.value })}
        />
      </Grid>
    </DetailPanelSection>
  );
};
