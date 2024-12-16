import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BasicSpinner,
  InvoiceNodeStatus,
  isEqual,
  NothingHere,
  RouteBuilder,
  useBreadcrumbs,
  useConfirmOnLeaving,
  useDirtyCheck,
  useNavigate,
  useParams,
} from '@openmsupply-client/common';

import { ItemRowFragment, ListItems } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { PageLayout } from './PageLayout';
import { usePrescription, usePrescriptionLines } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { PrescriptionLineEdit } from './PrescriptionLineEdit';
import { DraftStockOutLine } from '../../types';
import { Footer } from './Footer';
import { NavBar } from './NavBar';

export const PrescriptionLineEditView = () => {
  const { invoiceNumber, itemId } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  const {
    query: { data, loading: isLoading },
  } = usePrescription();

  const {
    save: { saveLines, isSavingLines },
    // delete: { deleteLines },
  } = usePrescriptionLines(data?.id);

  const newItemId = useRef<string>();

  const { isDirty, setIsDirty } = useDirtyCheck();

  const lines =
    data?.lines.nodes.sort((a, b) => a.id.localeCompare(b.id)) ?? [];

  const invoiceId = data?.id ?? '';
  const status = data?.status;

  const [allDraftLines, setAllDraftLines] = useState<
    Record<string, DraftStockOutLine[]>
  >({});

  let currentItem = lines.find(line => line.item.id === itemId)?.item;

  let items = useMemo(() => {
    let itemSet = new Set();
    let items: ItemRowFragment[] = [];
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
      2: currentItem?.name || '',
    });
  }, [currentItem]);

  useConfirmOnLeaving(
    isDirty,
    // Need a custom checking method here, as we don't want to warn user when
    // switching to a different item within this page
    (current, next) => {
      if (!isDirty) return false;

      const currentPathParts = current.pathname.split('/');
      const nextPathParts = next.pathname.split('/');
      // Compare URLS, but don't include the last part, which is the ItemID
      currentPathParts.pop();
      nextPathParts.pop();
      return !isEqual(currentPathParts, nextPathParts);
    }
  );

  const updateAllLines = (lines: DraftStockOutLine[]) => {
    if (itemId === 'new') {
      newItemId.current = lines[0]?.item.id;
    }

    if (typeof itemId === 'string')
      setAllDraftLines({ ...allDraftLines, [itemId]: lines });
  };

  const onSave = async () => {
    if (!isDirty) return;

    const flattenedLines = Object.values(allDraftLines).flat();

    // needed since placeholders aren't being created for prescriptions yet, but
    // still adding to array
    const isOnHold = flattenedLines.some(
      ({ stockLine, location }) => stockLine?.onHold || location?.onHold
    );

    const patch =
      status !== InvoiceNodeStatus.Picked &&
      flattenedLines.length >= 1 &&
      !isOnHold
        ? {
            id: invoiceId,
            status: InvoiceNodeStatus.Picked,
          }
        : undefined;

    await saveLines({
      draftPrescriptionLines: flattenedLines,
      patch,
    });

    // For "NEW" items, navigate to newly-created item page
    if (newItemId.current) {
      const itemId = newItemId.current;
      newItemId.current = undefined;
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .addPart(invoiceNumber ?? '')
          .addPart(itemId)
          .build()
      );
    }
    setIsDirty(false);
  };

  if (isLoading || !itemId) return <BasicSpinner />;
  if (!data) return <NothingHere />;

  const itemIdList = items.map(item => item.id);
  if (status !== InvoiceNodeStatus.Verified) itemIdList.push('new');

  return (
    <>
      <AppBarButtons invoiceNumber={data?.invoiceNumber} />
      <PageLayout
        Left={
          <ListItems
            currentItemId={itemId}
            items={items}
            route={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Prescription)
              .addPart(String(invoiceNumber))}
            enteredLineIds={enteredLineIds}
            showNew={status !== InvoiceNodeStatus.Verified}
          />
        }
        Right={
          <>
            <PrescriptionLineEdit
              draft={{ item: currentItem }}
              // items={items}
              draftLines={allDraftLines[itemId] ?? []}
              updateLines={updateAllLines}
              setIsDirty={setIsDirty}
            />
            <NavBar
              items={itemIdList}
              currentItem={itemId}
              setItem={itemId =>
                navigate(
                  RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Prescription)
                    .addPart(invoiceNumber ?? '')
                    .addPart(itemId)
                    .build()
                )
              }
            />
          </>
        }
      />
      <Footer isSaving={isSavingLines} isDirty={isDirty} handleSave={onSave} />
    </>
  );
};
