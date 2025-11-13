import React, { useEffect } from 'react';
import {
  BasicSpinner,
  Grid,
  useBufferState,
  useFormatNumber,
  usePreferences,
  useTranslation,
} from '@openmsupply-client/common';
import { usePrescription } from '../api';
import { PrescriptionLineEditForm } from './PrescriptionLineEditForm';
import { StockItemSearchInput } from '@openmsupply-client/system';
import {
  AllocateInType,
  AllocationStrategy,
  useAllocationContext,
  useOutboundLineEditData,
} from '../../StockOut';
import { AccordionPanelSection } from './PanelSection';

interface PrescriptionLineEditProps {
  programId?: string;
  invoiceId: string;
  itemId: string | undefined;
}

export const PrescriptionLineEdit = ({
  itemId,
  programId,
  invoiceId,
}: PrescriptionLineEditProps) => {
  const isNew = !itemId;

  const t = useTranslation();
  const { format } = useFormatNumber();
  const { manageVaccinesInDoses, sortByVvmStatusThenExpiry } = usePreferences();

  // Needs to update when user clicks on different item in the list, or when
  // changing item with the selector
  const [currentItemId, setCurrentItemId] = useBufferState(itemId);

  const { isDisabled, rows: lines } = usePrescription(); // TODO: how much can we strip now?

  const { clear, initialise, item } = useAllocationContext(
    ({ initialise, item, clear }) => ({
      initialise,
      item,
      clear,
    })
  );

  const { refetch: queryData, isFetching } = useOutboundLineEditData(
    invoiceId,
    currentItemId
  );

  useEffect(() => {
    if (!currentItemId) {
      clear(); // Clear context if switched to new item
      return;
    }

    // Manual query for item + prescription line data,
    // only initialise for allocation when data is available
    queryData().then(({ data }) => {
      if (!data) return;

      initialise(
        {
          itemData: data,
          strategy: sortByVvmStatusThenExpiry
            ? AllocationStrategy.VVMStatus
            : AllocationStrategy.FEFO,
          allowPlaceholder: false,
          allowPrescribedQuantity: true,
          ignoreNonAllocatableLines: true,
          // In prescriptions, default to allocate in doses for vaccines
          // if pref is on
          allocateIn:
            manageVaccinesInDoses && data.item.isVaccine
              ? { type: AllocateInType.Doses }
              : undefined,
        },
        format,
        t
      );
    });
    // Expect dependencies to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemId]);

  const existingItemIds = lines.map(line => line.item.id);

  return (
    <Grid
      container
      gap="4px"
      sx={{ minHeight: 200, display: 'flex', flexDirection: 'column' }}
    >
      <AccordionPanelSection
        title={t('label.item', { count: 1 })}
        closedSummary={item?.name ? [{ text: item.name }] : []}
        defaultExpanded={isNew && !isDisabled}
      >
        <Grid flex={1}>
          <StockItemSearchInput
            autoFocus={isNew}
            openOnFocus={isNew}
            disabled={!isNew || isDisabled}
            currentItemId={itemId ?? currentItemId}
            onChange={item => setCurrentItemId(item?.id)}
            filter={{
              isVisibleOrOnHand: true,
              id: { notEqualAll: existingItemIds },
            }}
            programId={programId}
          />
        </Grid>
      </AccordionPanelSection>

      {isFetching ? (
        <BasicSpinner inline style={{ flexGrow: 1 }} />
      ) : item ? (
        <PrescriptionLineEditForm disabled={isDisabled} isNew={isNew} />
      ) : null}
    </Grid>
  );
};
