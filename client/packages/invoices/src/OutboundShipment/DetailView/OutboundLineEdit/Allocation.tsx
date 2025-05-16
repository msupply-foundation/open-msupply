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
  usePreference,
  PreferenceKey,
} from '@openmsupply-client/common';
import { OutboundLineEditTable } from './OutboundLineEditTable';
import { AutoAllocate } from './AutoAllocate';
import { useOutbound, OutboundLineEditData } from '../../api';
import { DraftItem } from '../../..';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import {
  useAllocationContext,
  AllocationStrategy,
} from './allocation/useAllocationContext';
import { sumAvailableQuantity } from './allocation/utils';

interface AllocationProps {
  itemData: OutboundLineEditData;
  allowPlaceholder: boolean;
  scannedBatch?: string;
}

export const Allocation = ({
  itemData,
  allowPlaceholder,
  scannedBatch,
}: AllocationProps) => {
  const { initialise, initialisedForItemId } = useAllocationContext(
    ({ initialise, initialisedForItemId }) => ({
      initialise,
      initialisedForItemId,
    })
  );

  const { data: sortByVvmStatus } = usePreference(
    PreferenceKey.SortByVvmStatusThenExpiry
  );

  useEffect(() => {
    initialise(
      itemData,
      sortByVvmStatus ? AllocationStrategy.VVMStatus : AllocationStrategy.FEFO,
      allowPlaceholder,
      scannedBatch
    );
  }, [sortByVvmStatus]);

  return initialisedForItemId === itemData.item.id ? (
    <AllocationInner item={itemData.item} />
  ) : null;
};

const AllocationInner = ({ item }: { item: DraftItem }) => {
  const t = useTranslation();

  const { currency, otherParty } = useOutbound.document.fields([
    'currency',
    'otherParty',
  ]);
  const { draftLines } = useAllocationContext(({ draftLines }) => ({
    draftLines,
  }));

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
        currentItem={item}
        isLoading={false}
        currency={currency}
        isExternalSupplier={!otherParty?.store}
      />
    </>
  );
};

interface TableProps {
  currentItem: DraftItem;
  isLoading: boolean;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}

const TableWrapper = ({
  currentItem,
  isLoading,
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
        item={currentItem}
        currency={currency}
        isExternalSupplier={isExternalSupplier}
      />
    </TableProvider>
  );
};
