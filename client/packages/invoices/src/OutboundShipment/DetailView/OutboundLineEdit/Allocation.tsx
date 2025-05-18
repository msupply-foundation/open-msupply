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
  BasicSpinner,
} from '@openmsupply-client/common';
import { OutboundLineEditTable } from './OutboundLineEditTable';
import { AutoAllocate } from './AutoAllocate';
import { useOutbound, useOutboundLineEditData } from '../../api';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import {
  useAllocationContext,
  AllocationStrategy,
} from './allocation/useAllocationContext';
import { sumAvailableQuantity } from './allocation/utils';

interface AllocationProps {
  itemId: string;
  invoiceId: string;
  allowPlaceholder: boolean;
  scannedBatch?: string;
}

export const Allocation = ({
  itemId,
  invoiceId,
  allowPlaceholder,
  scannedBatch,
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
    queryData().then(({ data }) => {
      if (!data) return;

      initialise(data, AllocationStrategy.FEFO, allowPlaceholder, scannedBatch);
    });
    // Expect dependencies to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isFetching ? <BasicSpinner /> : item ? <AllocationInner /> : null;
};

const AllocationInner = () => {
  const t = useTranslation();

  const { currency, otherParty } = useOutbound.document.fields([
    'currency',
    'otherParty',
  ]);
  const { draftLines, item } = useAllocationContext(({ draftLines, item }) => ({
    draftLines,
    item,
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
        isLoading={false}
        currency={currency}
        isExternalSupplier={!otherParty?.store}
      />
    </>
  );
};

interface TableProps {
  isLoading: boolean;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}

const TableWrapper = ({
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
        currency={currency}
        isExternalSupplier={isExternalSupplier}
      />
    </TableProvider>
  );
};
