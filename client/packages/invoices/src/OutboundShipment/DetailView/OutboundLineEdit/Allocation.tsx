import React, { useEffect } from 'react';
import {
  Typography,
  InlineSpinner,
  Box,
  useTranslation,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  ModalRow,
  ModalLabel,
  Grid,
  BasicTextInput,
} from '@openmsupply-client/common';
import { OutboundLineEditTable } from './OutboundLineEditTable';
import { AutoAllocate } from './AutoAllocate';
import { useOutbound, OutboundLineEditData } from '../../api';
import { DraftItem } from '../../..';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import { useAllocationContext } from './allocation/useAllocationContext';
import { DraftOutboundLineFragment } from '../../api/operations.generated';
import { sumAvailableQuantity } from './allocation/utils';

interface AllocationProps {
  itemData: OutboundLineEditData;
  allowPlaceholder: boolean;
}

export const Allocation = ({ itemData, allowPlaceholder }: AllocationProps) => {
  const { initialise, initialisedForItemId } = useAllocationContext(
    ({ initialise, initialisedForItemId }) => ({
      initialise,
      initialisedForItemId,
    })
  );

  useEffect(() => {
    initialise(itemData, allowPlaceholder);
  }, []);

  return initialisedForItemId === itemData.item.id ? (
    <AllocationInner item={itemData.item} />
  ) : null;
};

const AllocationInner = ({ item }: { item: DraftItem }) => {
  const t = useTranslation();
  // const { setIsDirty } = useConfirmOnLeaving('outbound-shipment-line-edit');

  const { currency, otherParty } = useOutbound.document.fields([
    'currency',
    'otherParty',
  ]);
  const { draftLines, manualAllocate } = useAllocationContext(
    ({ draftLines, manualAllocate }) => ({
      draftLines,
      manualAllocate,
    })
  );

  const hasLines = !!draftLines.length;

  return (
    <>
      <ModalRow>
        <ModalLabel label="" />
        <Grid display="flex">
          <Typography
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {t('label.available-quantity', {
              number: sumAvailableQuantity(draftLines).toFixed(0),
            })}
          </Typography>
        </Grid>

        <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <BasicTextInput disabled sx={{ width: 150 }} value={item?.unitName} />
        </Grid>
      </ModalRow>

      <AutoAllocate />

      <TableWrapper
        hasLines={hasLines}
        currentItem={item}
        isLoading={false}
        updateQuantity={manualAllocate}
        draftOutboundLines={draftLines}
        // batch={openedWith?.batch}
        batch={undefined} // Scanned batch - context?
        currency={currency}
        isExternalSupplier={!otherParty?.store}
      />
    </>
  );
};

interface TableProps {
  hasLines: boolean;
  currentItem: DraftItem;
  isLoading: boolean;
  updateQuantity: (batchId: string, updateQuantity: number) => void;
  draftOutboundLines: DraftOutboundLineFragment[];
  batch?: string;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}

const TableWrapper = ({
  currentItem,
  isLoading,
  updateQuantity,
  currency,
  isExternalSupplier,
}: TableProps) => {
  if (isLoading)
    return (
      <Box
        display="flex"
        flex={1}
        height={300}
        justifyContent="center"
        alignItems="center"
      >
        <InlineSpinner />
      </Box>
    );

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
      <OutboundLineEditTable
        onChange={updateQuantity}
        item={currentItem}
        // batch={batch}
        currency={currency}
        isExternalSupplier={isExternalSupplier}
      />
    </TableProvider>
  );
};
