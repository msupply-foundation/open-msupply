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
  useIntlUtils,
  BasicSpinner,
} from '@openmsupply-client/common';
import { OutboundLineEditTable } from './OutboundLineEditTable';
import { AutoAllocate } from './AutoAllocate';
import { useOutbound, useOutboundLineEditData } from '../../api';
import { CurrencyRowFragment } from '@openmsupply-client/system';
import {
  useAllocationContext,
  AllocationStrategy,
  AllocateInType,
} from './allocation/useAllocationContext';
import { sumAvailableDoses, sumAvailableUnits } from './allocation/utils';

interface AllocationProps {
  itemId: string;
  invoiceId: string;
  allowPlaceholder: boolean;
  scannedBatch?: string;
  prefOptions: {
    sortByVvmStatus: boolean;
  };
}

export const Allocation = ({
  itemId,
  invoiceId,
  allowPlaceholder,
  scannedBatch,
  prefOptions: { sortByVvmStatus },
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
        allowPlaceholder,
        scannedBatch,
      });
    });
    // Expect dependencies to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isFetching ? <BasicSpinner /> : item ? <AllocationInner /> : null;
};

const AllocationInner = () => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();

  const { currency, otherParty } = useOutbound.document.fields([
    'currency',
    'otherParty',
  ]);
  const { draftLines, item, allocateIn } = useAllocationContext(
    ({ allocateIn, item, draftLines }) => ({
      draftLines,
      allocateIn,
      item,
    })
  );

  const getAvailableQuantity = () => {
    const unitCount = Math.round(sumAvailableUnits(draftLines));

    const unitName = item?.unitName ?? t('label.unit');
    const pluralisedUnitName = getPlural(unitName, unitCount);

    return allocateIn.type === AllocateInType.Doses
      ? t('label.available-quantity-doses', {
          doseCount: sumAvailableDoses(draftLines).toFixed(0),
          unitCount: unitCount,
          unitName: pluralisedUnitName,
        })
      : t('label.available-quantity', {
          number: unitCount,
          unitName: pluralisedUnitName,
        });
  };

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
            {getAvailableQuantity()}
          </Typography>
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
