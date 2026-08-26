import React from 'react';
import {
  useTranslation,
  Grid,
  useAuthContext,
  Typography,
} from '@openmsupply-client/common';
import { AutoAllocateField, AllocateInSelector } from '../../StockOut';
import { AccordionPanelSection } from './PanelSection';
import { PrescriptionLineEditTable } from './PrescriptionLineEditTable';
import { AutoAllocatePrescribedQuantityField } from './AutoAllocatePrescribedQuantityField';

export const AllocationSection = ({
  disabled,
  hasLines,
}: {
  disabled: boolean;
  hasLines: boolean;
}) => {
  const t = useTranslation();
  const { store: { preferences } = {} } = useAuthContext();

  const showPrescribedQuantity =
    preferences?.editPrescribedQuantityOnPrescription ?? true;

  return (
    <>
      {showPrescribedQuantity && <AutoAllocatePrescribedQuantityField />}
      <Grid display="flex" alignItems="center" gap={1}>
        <AutoAllocateField
          inputColor="white"
          allowPartialPacks
          autoFocus={!showPrescribedQuantity}
          disabled={disabled}
        />
        <AllocateInSelector />
      </Grid>
      {hasLines ? (
        <AccordionPanelSection
          title={t('label.batches')}
          defaultExpanded={false}
          key={'item_table'}
          backgroundColor="background.white"
        >
          <PrescriptionLineEditTable disabled={disabled} />
        </AccordionPanelSection>
      ) : (
        <Typography style={{ width: '100%' }}>
          {t('messages.no-stock-available')}
        </Typography>
      )}
    </>
  );
};
