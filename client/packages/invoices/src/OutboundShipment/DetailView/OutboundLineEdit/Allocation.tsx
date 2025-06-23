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
  Divider,
} from '@openmsupply-client/common';
import { OutboundLineEditTable } from './OutboundLineEditTable';
import {
  AutoAllocateField,
  AutoAllocationAlerts,
  useAllocationContext,
  AllocationStrategy,
  AllocateInType,
  sumAvailableDoses,
  sumAvailableUnits,
  AllocateInSelector,
  useOutboundLineEditData,
  AllocateInOption,
} from '../../../StockOut';
import { useOutbound } from '../../api';
import { CurrencyRowFragment } from '@openmsupply-client/system';

interface AllocationProps {
  itemId: string;
  invoiceId: string;
  allowPlaceholder: boolean;
  scannedBatch?: string;
  prefOptions: {
    sortByVvmStatus: boolean;
    manageVaccinesInDoses: boolean;
  };
}

export const Allocation = ({
  itemId,
  invoiceId,
  allowPlaceholder,
  scannedBatch,
  prefOptions: { sortByVvmStatus, manageVaccinesInDoses },
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

      const packsizes = [
        ...new Set(data.draftLines.map(line => line.packSize)),
      ];

      // if there is only one packsize, we should auto-allocate in packs for that size
      const allocateInPacksize: AllocateInOption | undefined =
        packsizes.length === 1 && packsizes[0]
          ? {
              type: AllocateInType.Packs,
              packSize: packsizes[0],
            }
          : undefined;

      initialise({
        itemData: data,
        strategy: sortByVvmStatus
          ? AllocationStrategy.VVMStatus
          : AllocationStrategy.FEFO,
        allowPlaceholder,
        scannedBatch,
        // Default to allocate in doses for vaccines if pref is on
        allocateIn:
          manageVaccinesInDoses && data.item.isVaccine
            ? { type: AllocateInType.Doses }
            : allocateInPacksize,
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
      <Grid container gap="4px" width="100%">
        <Divider margin={10} />

        <Box display="flex" alignItems="flex-start" gap={2}>
          <Grid container alignItems="center" pt={1}>
            <AutoAllocateField />
            <AllocateInSelector includePackSizeOptions />
          </Grid>
          <AutoAllocationAlerts />
        </Box>
      </Grid>
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
