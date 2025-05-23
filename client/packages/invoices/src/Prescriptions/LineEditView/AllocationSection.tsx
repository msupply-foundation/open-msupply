import React, { useEffect } from 'react';
import {
  useTranslation,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  Grid,
  BasicSpinner,
  useAuthContext,
} from '@openmsupply-client/common';
import { AutoAllocateField } from '../../Allocation/AutoAllocateIssueField';
import { useOutboundLineEditData } from '../../OutboundShipment/api'; // TODO: Fix -  move api stuff to shared location
import {
  useAllocationContext,
  AllocationStrategy,
  AllocateInType,
} from '../../Allocation/useAllocationContext';
import { AccordionPanelSection } from './PanelSection';
import { PrescriptionLineEditTable } from './PrescriptionLineEditTable';
import { AutoAllocatePrescribedQuantityField } from './AutoAllocatePrescribedQuantityField';
import { AllocateInSelector } from '../../Allocation/AllocateInSelector';

interface AllocationProps {
  itemId: string;
  invoiceId: string;
  scannedBatch?: string;
  disabled?: boolean;
  prefOptions: {
    allocateVaccineItemsInDoses?: boolean;
    sortByVvmStatus: boolean;
  };
}

export const AllocationSection = ({
  itemId,
  invoiceId,
  scannedBatch,
  disabled,
  prefOptions: { allocateVaccineItemsInDoses, sortByVvmStatus },
}: AllocationProps) => {
  const { initialise, item } = useAllocationContext(({ initialise, item }) => ({
    initialise,
    item,
  }));

  const { refetch: queryData, isFetching } = useOutboundLineEditData(
    invoiceId,
    itemId
  );

  useEffect(() => {
    // Manual query, only initialise when data is available
    queryData().then(({ data }) => {
      if (!data) return;

      initialise({
        itemData: data,
        strategy: sortByVvmStatus
          ? AllocationStrategy.VVMStatus
          : AllocationStrategy.FEFO,
        allowPlaceholder: false,
        allowPrescribedQuantity: true,
        scannedBatch,
        // In prescriptions, default to allocate in doses for vaccines
        // if pref is on
        allocateIn:
          allocateVaccineItemsInDoses && data.item.isVaccine
            ? { type: AllocateInType.Doses }
            : undefined,
      });
    });
    // Expect dependencies to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isFetching ? (
    <BasicSpinner />
  ) : item ? (
    <AllocationInner disabled={disabled} />
  ) : null;
};

const AllocationInner = ({ disabled }: { disabled?: boolean }) => {
  const t = useTranslation();
  const { store: { preferences } = {} } = useAuthContext();

  return (
    <>
      {preferences?.editPrescribedQuantityOnPrescription && (
        <AutoAllocatePrescribedQuantityField />
      )}
      <Grid display="flex" alignItems="center" gap={1}>
        <AutoAllocateField inputColor="white" allowPartialPacks />
        <AllocateInSelector />
      </Grid>
      <AccordionPanelSection
        title={t('label.batches')}
        defaultExpanded={false}
        // key={key + '_table'} // Do we need to use a custom key again? item_id?
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
