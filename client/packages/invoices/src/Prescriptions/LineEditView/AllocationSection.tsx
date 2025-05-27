import React from 'react';
import {
  useTranslation,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  Grid,
  useAuthContext,
} from '@openmsupply-client/common';
import { AutoAllocateField, AllocateInSelector } from '../../StockOut';
import { AccordionPanelSection } from './PanelSection';
import { PrescriptionLineEditTable } from './PrescriptionLineEditTable';
import { AutoAllocatePrescribedQuantityField } from './AutoAllocatePrescribedQuantityField';

export const AllocationSection = ({ disabled }: { disabled?: boolean }) => {
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
        />
        <AllocateInSelector />
      </Grid>
      <AccordionPanelSection
        title={t('label.batches')}
        defaultExpanded={false}
        key={'item_table'}
        backgroundColor="background.white"
      >
        <TableWrapper disabled={disabled} />
      </AccordionPanelSection>
    </>
  );
};

interface TableProps {
  disabled?: boolean;
}

const TableWrapper = ({ disabled }: TableProps) => {
  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
      <PrescriptionLineEditTable disabled={disabled} />
    </TableProvider>
  );
};
