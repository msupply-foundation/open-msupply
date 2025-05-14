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
  allocateVaccineItemsInDoses: boolean;
  scannedBatch?: string;
}

export const Allocation = ({
  itemData,
  allowPlaceholder,
  allocateVaccineItemsInDoses,
  scannedBatch,
}: AllocationProps) => {
  const { initialise, initialisedForItemId } = useAllocationContext(
    ({ initialise, initialisedForItemId }) => ({
      initialise,
      initialisedForItemId,
    })
  );

  useEffect(() => {
    initialise({
      input: itemData,
      strategy: AllocationStrategy.FEFO,
      allowPlaceholder,
      allocateVaccineItemsInDoses,
      scannedBatch,
    });
  }, []);

  return initialisedForItemId === itemData.item.id ? (
    <AllocationInner item={itemData.item} />
  ) : null;
};

const AllocationInner = ({ item }: { item: DraftItem }) => {
  const t = useTranslation();
  // const { getPlural } = useIntlUtils();
  // const { data: prefs } = usePreference(PreferenceKey.DisplayVaccineInDoses);
  // const dispensingInDoses =
  //   (item?.isVaccine && prefs?.displayVaccineInDoses) ?? false;

  const { currency, otherParty } = useOutbound.document.fields([
    'currency',
    'otherParty',
  ]);
  const { draftLines } = useAllocationContext(({ draftLines }) => ({
    draftLines,
  }));
  // const getDisplayQuantity = (quantity: number, unit: string) => {
  //   const rounded = Math.round(quantity);
  //   return `${rounded} ${getPlural(unit, rounded)}`;
  // };

  // const unitName = item?.unitName ?? t('label.unit');

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
            {/* TODO: RTL! should be in a translation string */}
            {/* {t('label.available')}:{' '}
            {dispensingInDoses
              ? `${getDisplayQuantity(availableQuantity * item.doses, t('label.dose'))} (${getDisplayQuantity(availableQuantity, unitName)})`
              : getDisplayQuantity(availableQuantity, unitName)} */}
            {t('label.available', {
              number: sumAvailableQuantity(draftLines).toFixed(0),
            })}
          </Typography>
        </Grid>

        {/* <Grid style={{ display: 'flex' }} justifyContent="flex-end" flex={1}>
          <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
          <BasicTextInput disabled sx={{ width: 150 }} value={item?.unitName} />
        </Grid> */}
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
