import React, { useEffect, useState } from 'react';
import {
  InlineSpinner,
  Box,
  useTranslation,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  Grid,
  useIntlUtils,
  BasicSpinner,
  InputLabel,
  useAuthContext,
  NumericTextInput,
  usePreference,
  PreferenceKey,
  NumUtils,
} from '@openmsupply-client/common';
import { OutboundLineEditTable } from '../../OutboundShipment/DetailView/OutboundLineEdit/OutboundLineEditTable'; // TODO: FIx
import { AutoAllocate } from '../../Allocation/AutoAllocate';
import {
  useOutbound,
  useOutboundLineEditData,
} from '../../OutboundShipment/api'; // TODO: FIx
import { CurrencyRowFragment } from '@openmsupply-client/system';
import {
  useAllocationContext,
  AllocationStrategy,
} from '../../Allocation/useAllocationContext';
import { AccordionPanelSection } from './PanelSection';
import { set } from 'lodash';

interface AllocationProps {
  itemId: string;
  invoiceId: string;
  allowPlaceholder: boolean;
  scannedBatch?: string;
  disabled?: boolean;
  prefOptions: {
    allocateVaccineItemsInDoses: boolean;
    sortByVvmStatus: boolean;
  };
}

export const Allocation = ({
  itemId,
  invoiceId,
  allowPlaceholder,
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
        allowPlaceholder,
        scannedBatch,
        allocateVaccineItemsInDoses,
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

  const { store: { preferences } = {} } = useAuthContext();
  const { data: OMSPrefs } = usePreference(
    PreferenceKey.DisplayVaccinesInDoses
  );

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

  // Copied over needs review!
  const [prescribedQuantity, setPrescribedQuantity] = useState<number | null>(
    null
  );
  const displayInDoses =
    !!OMSPrefs?.displayVaccinesInDoses && !!item?.isVaccine;
  const unitName = item?.unitName ?? t('label.unit');
  // End of copied code

  return (
    <>
      {preferences?.editPrescribedQuantityOnPrescription && (
        <Grid display="flex" alignItems="center" gap={1}>
          <InputLabel sx={{ fontSize: 12 }}>
            {t('label.prescribed-quantity')}
          </InputLabel>
          <NumericTextInput
            autoFocus={preferences?.editPrescribedQuantityOnPrescription}
            // disabled={disabled}
            disabled={false} // todo: fix
            value={
              //   displayInDoses
              //     ? NumUtils.round(prescribedQuantity ?? 0 * item.doses)
              //     : (prescribedQuantity ?? undefined)
              // }
              prescribedQuantity ?? undefined
            }
            onChange={(qty?: number) => {
              setPrescribedQuantity(qty ?? null);
              // if (qty) {
              //   const dosesToUnit = qty / (item.doses || 1);
              //   handlePrescribedQuantityChange(
              //     displayInDoses ? dosesToUnit : qty
              //   );
              // }
            }}
            min={0}
            decimalLimit={2}
            onBlur={() => {}}
            slotProps={{
              htmlInput: {
                sx: {
                  backgroundColor: 'background.white',
                },
              },
            }}
          />
        </Grid>
      )}
      <Grid display="flex" alignItems="center" gap={1}>
        {/* <InputLabel sx={{ fontSize: 12 }}>{t('label.issue')}</InputLabel>
        <NumericTextInput
          autoFocus={!preferences?.editPrescribedQuantityOnPrescription}
          disabled={false} // todo: fix
          value={
            // // displayInDoses
            // //   ? NumUtils.round(issueUnitQuantity * item.doses)
            //   : issueUnitQuantity
            issueUnitQuantity
          }
          onChange={(qty?: number) => {
            if (qty) {
              // NOTE: this value may be wrong, if issue quantity is set by
              // editing individual lines, which might have variants with different
              // doses per unit - should be resolved by new allocation context
              const dosesToUnit = qty / (item.doses || 1);
              handleIssueQuantityChange(displayInDoses ? dosesToUnit : qty);
            }
          }}
          min={0}
          decimalLimit={2}
          slotProps={{
            htmlInput: {
              sx: {
                backgroundColor: 'background.white',
              },
            },
          }}
          onKeyDown={e => {
            if (e.code === 'Tab') {
              e.preventDefault();
              abbreviationRef.current?.focus();
            }
          }}
        /> */}
        <AutoAllocate />
        {/* <InputLabel sx={{ fontSize: 12 }}>
        {getPlural(
          unit,
          displayInDoses ? issueUnitQuantity * item?.doses : issueUnitQuantity
        )}
      </InputLabel> */}
      </Grid>
      <AccordionPanelSection
        title={t('label.batches')}
        defaultExpanded={false}
        // key={key + '_table'}
        key={'item_table'}
        backgroundColor="background.white"
      >
        <TableWrapper
          isLoading={false}
          currency={currency}
          isExternalSupplier={!otherParty?.store}
        />
      </AccordionPanelSection>
    </>
  );
};

interface TableProps {
  isLoading: boolean;
  currency?: CurrencyRowFragment | null;
  isExternalSupplier: boolean;
}

// TODO: Replace with prescription version of this table...

const TableWrapper = ({
  isLoading,
  currency,
  isExternalSupplier,
  disabled,
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

  // TODO: re-create/review this logic
  // if (!canAutoAllocate)
  //   return (
  //     <Box sx={{ margin: 'auto' }}>
  //       <Typography>{t('messages.no-stock-available')}</Typography>
  //     </Box>
  //   );

  return (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore({
        initialSortBy: { key: 'expiryDate' },
      })}
    >
      {/* <PrescriptionLineEditTable
          // packSizeController={packSizeController}
          onChange={updateQuantity}
          rows={draftPrescriptionLines}
          item={currentItem}
          allocatedUnits={allocatedUnits}
          isDisabled={isDisabled}
        /> */}

      <OutboundLineEditTable
        currency={currency}
        isExternalSupplier={isExternalSupplier}
      />
    </TableProvider>
  );
};
