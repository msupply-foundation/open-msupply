import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BasicSpinner,
  InvoiceNodeStatus,
  isEqual,
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
import { DraftPrescriptionLine } from '../../types';
import { Footer } from './Footer';
import { NavBar } from './NavBar';
import { useAllocationContext } from '../../Allocation/useAllocationContext';
import { useSavePrescriptionItemLineData } from '../api/hooks/useSavePrescriptionItemLineData';

export const PrescriptionLineEditView = () => {
  const { invoiceId = '', itemId } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const isDirty = useRef(false);
  const navigate = useNavigate();

  const {
    isDirty: allocationIsDirty,
    draftLines,
    prescribedQuantity,
  } = useAllocationContext();
  // TODO: Change prescription version of this hook
  const {
    mutateAsync: savePrescriptionItemLineData,
    isLoading: isSavingLines,
  } = useSavePrescriptionItemLineData(invoiceId);

  const {
    query: { data, loading: isLoading },
    isDisabled,
  } = usePrescription();

  const newItemId = useRef<string>();

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

  const [allDraftLines, setAllDraftLines] = useState<
    Record<string, DraftPrescriptionLine[]>
  >({});

  const currentItem = lines.find(line => line.item.id === itemId)?.item;

  const items = useMemo(() => {
    const itemSet = new Set();
    const items: ItemRowFragment[] = [];
    lines.forEach(line => {
      if (!itemSet.has(line.item.id)) {
        items.push(line.item);
        itemSet.add(line.item.id);
      }
    });
    return items;
  }, [lines]);

  const enteredLineIds = lines
    .filter(line => line.numberOfPacks !== 0)
    .map(line => line.item.id);

  useEffect(() => {
    setCustomBreadcrumbs({
      1: data?.invoiceNumber.toString() ?? '',
      2: currentItem?.name || '',
    });
  }, [currentItem, data?.invoiceNumber, itemId]);

  useConfirmOnLeaving(
    'prescription-line-edit',
    // Need a custom checking method here, as we don't want to warn user when
    // switching to a different item within this page
    {
      customCheck: {
        navigate: (current, next) => {
          if (!isDirty.current) return false;

          const currentPathParts = current.pathname.split('/');
          const nextPathParts = next.pathname.split('/');
          // Compare URLS, but don't include the last part, which is the ItemID
          currentPathParts.pop();
          nextPathParts.pop();
          return !isEqual(currentPathParts, nextPathParts);
        },
        refresh: () => isDirty.current,
      },
    }
  );

  const updateAllLines = (lines: DraftPrescriptionLine[]) => {
    if (itemId === 'new') {
      newItemId.current = lines[0]?.item.id;
    }

    if (typeof itemId === 'string')
      setAllDraftLines({ ...allDraftLines, [itemId]: lines });
  };

  const onSave = async () => {
    if (allocationIsDirty) {
      savePrescriptionItemLineData({
        itemId: currentItem?.id ?? '',
        lines: draftLines,
        prescribedQuantity: prescribedQuantity,
        note: 'TODO: Add note here',
      });
    }

    // if (!isDirty.current) return;

    // TODO: Move to picked status? Backend?

    // For "NEW" items, navigate to newly-created item page
    if (newItemId.current) {
      const itemId = newItemId.current;
      newItemId.current = undefined;
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .addPart(invoiceId)
          .addPart(itemId)
          .build(),
        { replace: true }
      );
    }
    isDirty.current = false;
    setAllDraftLines({});
  };

  if (isLoading || !itemId) return <BasicSpinner />;
  if (!data) return <NothingHere />;

  const itemIdList = items.map(item => item.id);
  if (status !== InvoiceNodeStatus.Verified) itemIdList.push('new');

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
              item={currentItem ?? null}
              draftLines={allDraftLines[itemId] ?? []}
              updateLines={updateAllLines}
              setIsDirty={dirty => {
                isDirty.current = dirty;
              }}
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
        isDirty={isDirty.current || allocationIsDirty}
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
