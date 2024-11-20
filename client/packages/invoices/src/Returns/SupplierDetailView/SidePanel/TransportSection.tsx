import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  BufferedTextInput,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const TransportSectionComponent: FC = () => {
  const t = useTranslation();
  const isDisabled = useReturns.utils.supplierIsDisabled();

  const { debouncedMutateAsync: debouncedUpdate } =
    useReturns.document.updateSupplierReturn();

  const {
    bufferedState: { id, transportReference } = { id: '' },
    setBufferedState,
  } = useReturns.document.supplierReturn();

  return (
    <DetailPanelSection title={t('heading.transport-details')}>
      <Grid container gap={0.5} key="transport-details">
        <PanelLabel display="flex" alignItems="center">
          {t('heading.reference')}
        </PanelLabel>
        <BufferedTextInput
          disabled={isDisabled}
          onChange={e => {
            const transportReference = e.target.value;
            setBufferedState({ transportReference });
            debouncedUpdate({ id, transportReference });
          }}
          value={transportReference}
          InputProps={{
            style: {
              backgroundColor: 'white',
            },
          }}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const TransportSection = memo(TransportSectionComponent);
