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
  usePreference,
  PreferenceKey,
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
  AllocateIn,
} from './allocation/useAllocationContext';
import { sumAvailableDoses, sumAvailableUnits } from './allocation/utils';

interface AllocationProps {
  itemId: string;
  invoiceId: string;
  allowPlaceholder: boolean;
  allocateVaccineItemsInDoses: boolean;
  scannedBatch?: string;
}

export const Allocation = ({
  itemId,
  invoiceId,
  allowPlaceholder,
  allocateVaccineItemsInDoses,
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

  const { data: sortByVvmStatus } = usePreference(
    PreferenceKey.SortByVvmStatusThenExpiry
  );

  useEffect(() => {
    queryData().then(({ data }) => {
      if (!data) return;

      initialise({
        itemData: data,
        strategy: sortByVvmStatus
          ? AllocationStrategy.VVMStatus
          : AllocationStrategy.FEFO,
        allowPlaceholder,
        scannedBatch,
        allocateVaccineItemsInDoses,
      });
    });
    // Expect dependencies to be stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortByVvmStatus]);

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

    return allocateIn === AllocateIn.Doses
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
