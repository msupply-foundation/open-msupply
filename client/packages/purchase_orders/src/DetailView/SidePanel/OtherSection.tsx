import React, { ReactElement } from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  UpdatePurchaseOrderInput,
  PanelRow,
  PanelLabel,
  BufferedTextArea,
} from '@openmsupply-client/common';
import { DonorSearchInput } from '@openmsupply-client/system/src';
import { PurchaseOrderFragment } from '../../api';

// TODO: ShippingMethod seems to have its own table - requires further investigation

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
    <DetailPanelSection title={t('label.other')}>
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
            onChange={donor => onUpdate({ donorLinkId: donor?.id })}
          />
        </PanelRow>
        {/* <PanelRow>
          <PanelLabel>{t('label.shipping-method')}</PanelLabel> 
        </PanelRow> */}
        <PanelLabel>{t('label.comment')}</PanelLabel>
        <BufferedTextArea
          value={data?.comment ?? ''}
          onChange={e => onUpdate({ comment: e.target.value })}
        />
      </Grid>
    </DetailPanelSection>
  );
};
