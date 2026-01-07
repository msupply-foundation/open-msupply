import React, { useEffect, useMemo, useRef } from 'react';
import {
  BasicSpinner,
  InvoiceNodeStatus,
  NothingHere,
  RouteBuilder,
  useBreadcrumbs,
  useConfirmOnLeaving,
  useNavigate,
  useParams,
} from '@openmsupply-client/common';

import { ItemRowFragment, ListItems } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { PageLayout } from './PageLayout';
import { usePrescription } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { PrescriptionLineEdit } from './PrescriptionLineEdit';
import { Footer } from './Footer';
import { NavBar } from './NavBar';
import { getAllocatedQuantity, useAllocationContext } from '../../StockOut';
import { useSavePrescriptionItemLineData } from '../api/hooks/useSavePrescriptionItemLineData';

export const PrescriptionLineEditView = () => {
  const { invoiceId = '', itemId } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const isDirty = useRef(false);
  const navigate = useNavigate();

  const {
    isDirty: allocationIsDirty,
    draftLines,
    item,
    prescribedUnits,
    note,
    allocatedQuantity,
    setIsDirty: setAllocationIsDirty,
  } = useAllocationContext(state => ({
    ...state,
    allocatedQuantity: getAllocatedQuantity(state),
  }));

  const {
    mutateAsync: savePrescriptionItemLineData,
    isLoading: isSavingLines,
  } = useSavePrescriptionItemLineData(invoiceId);

  const {
    query: { data, loading: isLoading },
    isDisabled,
  } = usePrescription();

  // This ref is attached to the currently selected list item, and is used to
  // "scroll into view" when the Previous/Next buttons are clicked in the NavBar
  const scrollRef = useRef<null | HTMLLIElement>(null);
  const scrollSelectedItemIntoView = () =>
    // Small time delay to allow the ref to change to the previous/next item in
    // the list before scrolling to it
    setTimeout(() => scrollRef.current?.scrollIntoView(), 100);

  const lines =
    data?.lines.nodes.sort((a, b) => a.id.localeCompare(b.id)) ?? [];

  const status = data?.status;

  // Future TODO: expose on Prescription/Invoice query - items, and whether they have
  // any packs allocated or not!
  const items = useMemo(() => {
    const itemSet = new Set();
    const items: ItemRowFragment[] = [];
    (data?.lines.nodes ?? [])
      .sort((a, b) => a.item.name.localeCompare(b.item.name))
      .forEach(line => {
        if (!itemSet.has(line.item.id)) {
          items.push(line.item);
          itemSet.add(line.item.id);
        }
      });
    return items;
  }, [data]);

  const enteredLineIds = lines
    .filter(line => line.numberOfPacks !== 0)
    .map(line => line.item.id);

  useEffect(() => {
    setCustomBreadcrumbs({
      1: data?.invoiceNumber.toString() ?? '',
      2: item?.name || '',
    });
  }, [item, data?.invoiceNumber, itemId]);

  useConfirmOnLeaving(
    'prescription-line-edit',
    // Need a custom checking method here, as we don't want to warn user when
    // switching to a different item within this page
    {
      customCheck: {
        navigate: () => isDirty.current,
        refresh: () => isDirty.current,
      },
    }
  );

  // TODO: We need a better solution for this long term!
  useEffect(() => {
    // Using useAllocationContext isDirty for rest of form, need to sync it with
    // the isDirty state for confirm on leaving
    isDirty.current = allocationIsDirty;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocationIsDirty]);

  const onSave = async () => {
    if (isDisabled) return;

    // Save should only be enabled if we have an item anyway...
    const contextItemId = item?.id ?? itemId;
    if (!contextItemId) {
      return;
    }

    if (allocationIsDirty) {
      await savePrescriptionItemLineData({
        itemId: contextItemId,
        lines: draftLines,
        prescribedUnits,
        note,
      });

      setAllocationIsDirty(false);
      // Need to reset explicitly here, as state is not updated before the useConfirmOnLeaving
      // hook checks for unsaved changes
      // TODO: solution to consolidate the two...
      isDirty.current = false;
    }

    if (itemId === 'new') {
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .addPart(invoiceId)
          .addPart(contextItemId)
          .build(),
        { replace: true }
      );
    }
  };

  if (isLoading || !itemId) return <BasicSpinner />;
  if (!data) return <NothingHere />;

  const itemIdList = items.map(item => item.id);
  if (
    status !== InvoiceNodeStatus.Verified &&
    status !== InvoiceNodeStatus.Cancelled
  ) {
    itemIdList.push('new');
  }

  return (
    <>
      <AppBarButtons invoiceId={data?.id} />
      <PageLayout
        Left={
          <ListItems
            currentItemId={itemId}
            items={items}
            route={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Prescription)
              .addPart(invoiceId)}
            enteredLineIds={enteredLineIds}
            showNew={!isDisabled}
            isDirty={isDirty.current}
            handleSaveNew={onSave}
            scrollRef={scrollRef}
          />
        }
        Right={
          <>
            <PrescriptionLineEdit
              // Key resets all component state when itemId changes
              key={itemId}
              itemId={itemId === 'new' ? undefined : itemId}
              programId={data?.programId ?? undefined}
              invoiceId={invoiceId}
            />
            <NavBar
              items={itemIdList}
              currentItem={itemId}
              setItem={itemId =>
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Prescription)
                    .addPart(invoiceId)
                    .addPart(itemId)
                    .build()
                )
              }
              scrollIntoView={scrollSelectedItemIntoView}
            />
          </>
        }
      />
      <Footer
        isSaving={isSavingLines}
        disabled={
          isDisabled ||
          !item?.id ||
          !allocationIsDirty ||
          (allocatedQuantity === 0 && prescribedUnits === 0)
        }
        handleSave={onSave}
        handleCancel={() =>
          navigate(
            RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Prescription)
              .addPart(invoiceId)
              .build()
          )
        }
      />
    </>
  );
};
