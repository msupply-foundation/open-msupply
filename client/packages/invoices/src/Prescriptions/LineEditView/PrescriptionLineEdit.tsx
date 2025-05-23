import React, { useEffect } from 'react';
import {
  BasicSpinner,
  Grid,
  useBufferState,
  useTranslation,
} from '@openmsupply-client/common';
import { usePrescription } from '../api';
import { PrescriptionLineEditForm } from './PrescriptionLineEditForm';
import { StockItemSearchInput } from '@openmsupply-client/system';
import {
  AllocateInType,
  AllocationStrategy,
  useAllocationContext,
} from '../../Allocation/useAllocationContext';
import { useOutboundLineEditData } from '../../OutboundShipment/api';
import { AccordionPanelSection } from './PanelSection';

interface PrescriptionLineEditProps {
  programId?: string;
  invoiceId: string;
  itemId: string | undefined;
  prefOptions: {
    allocateVaccineItemsInDoses?: boolean;
    sortByVvmStatus: boolean;
  };
}

export const PrescriptionLineEdit = ({
  itemId,
  programId,
  invoiceId,
  prefOptions: { allocateVaccineItemsInDoses, sortByVvmStatus },
}: PrescriptionLineEditProps) => {
  const isNew = !itemId;

  const t = useTranslation();

  // Needs to update when user clicks on different item in the list, or when
  // changing item with the selector
  const [currentItemId, setCurrentItemId] = useBufferState(itemId);
  // const [currentItem, setCurrentItem] = useBufferState(item);

  const { isDisabled, rows: items } = usePrescription(); // TODO: how much can we strip now?

  const { initialise, item } = useAllocationContext(({ initialise, item }) => ({
    initialise,
    item,
  }));

  const { refetch: queryData, isFetching } = useOutboundLineEditData(
    invoiceId,
    currentItemId
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
  }, [currentItemId]);

  return (
    <Grid
      container
      gap="4px"
      sx={{ minHeight: 200, display: 'flex', flexDirection: 'column' }}
    >
      <AccordionPanelSection
        // Key ensures component will reload when switching item, but not when
        // making other changes within item (e.g. quantity)
        key={itemId + '_item_search'}
        title={t('label.item', { count: 1 })}
        closedSummary={item?.name}
        defaultExpanded={isNew && !isDisabled}
      >
        <Grid flex={1}>
          <StockItemSearchInput
            autoFocus={!itemId}
            openOnFocus={!itemId}
            disabled={!isNew || isDisabled}
            currentItemId={currentItemId}
            onChange={item => setCurrentItemId(item?.id)}
            filter={{ isVisibleOrOnHand: true }}
            extraFilter={
              isDisabled
                ? undefined
                : item => !items?.some(({ id }) => id === item.id)
            }
            programId={programId}
          />
        </Grid>
      </AccordionPanelSection>

      {isFetching ? (
        <BasicSpinner />
      ) : item ? (
        <PrescriptionLineEditForm
          key={itemId + '_form'}
          disabled={isDisabled}
          isNew={isNew}
        />
      ) : null}
    </Grid>
  );
};
