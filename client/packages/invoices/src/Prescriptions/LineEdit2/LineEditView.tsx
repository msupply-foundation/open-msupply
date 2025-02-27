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

import { AppRoute } from '@openmsupply-client/config';
import { PageLayout } from './PageLayout';
import { usePrescription, usePrescriptionLines } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { PrescriptionLineEdit } from './PrescriptionLineEdit';
import { DraftPrescriptionLine } from '../../types';
import { Footer } from './Footer';
import { NavBar } from './NavBar';
import { ListItems } from './toBeCommon/ListItems';

export const PrescriptionLineEditView2 = () => {
  const { invoiceNumber, itemId } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const isDirty = useRef(false);
  const navigate = useNavigate();

  const {
    query: { data, loading: isLoading },
    isDisabled,
  } = usePrescription();

  const {
    save: { saveLines, isSavingLines },
    // delete: { deleteLines },
  } = usePrescriptionLines(data?.id);

  const newItemId = useRef<string>();

  // This ref is attached to the currently selected list item, and is used to
  // "scroll into view" when the Previous/Next buttons are clicked in the NavBar
  const scrollRef = useRef<null | HTMLLIElement>(null);
  const scrollSelectedItemIntoView = () =>
    // Small time delay to allow the ref to change to the previous/next item in
    // the list before scrolling to it
    setTimeout(() => scrollRef.current?.scrollIntoView(), 100);

  const currentItem = data?.lines.nodes.find(
    line => line.item.id === itemId
  )?.item;

  useEffect(() => {
    setCustomBreadcrumbs({
      2: currentItem?.name || '',
    });
  }, [currentItem]);

  useConfirmOnLeaving(
    'prescription-line-edit',
    // Need a custom checking method here, as we don't want to warn user when
    // switching to a different item within this page
    {
      customCheck: (current, next) => {
        if (!isDirty.current) return false;

        const currentPathParts = current.pathname.split('/');
        const nextPathParts = next.pathname.split('/');
        // Compare URLS, but don't include the last part, which is the ItemID
        currentPathParts.pop();
        nextPathParts.pop();
        return !isEqual(currentPathParts, nextPathParts);
      },
    }
  );

  const onSave = async () => {};

  if (isLoading || !itemId) return <BasicSpinner />;
  if (!data) return <NothingHere />;

  // const itemIdList = items.map(item => item.id);
  // if (status !== InvoiceNodeStatus.Verified) itemIdList.push('new');

  return (
    <>
      <AppBarButtons invoiceNumber={data?.invoiceNumber} />
      <PageLayout
        Left={
          <ListItems
            currentItemId={itemId}
            items={data.items.nodes ?? []}
            route={RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Prescription)
              .addPart(String(invoiceNumber))}
            showNew={!isDisabled}
            isDirty={isDirty.current} // hm?
            handleSaveNew={onSave}
            scrollRef={scrollRef}
          />
        }
        Right={
          <>
            <PrescriptionLineEdit
              item={currentItem ?? null}
              setIsDirty={dirty => {
                isDirty.current = dirty;
              }}
              programId={data?.programId ?? undefined}
            />
            <NavBar
              items={(data.items.nodes ?? []).map(item => item.id)}
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
              scrollIntoView={scrollSelectedItemIntoView}
            />
          </>
        }
      />
      <Footer
        isSaving={isSavingLines}
        isDirty={isDirty.current}
        handleSave={onSave}
        handleCancel={() =>
          navigate(
            RouteBuilder.create(AppRoute.Dispensary)
              .addPart(AppRoute.Prescription)
              .addPart(String(invoiceNumber))
              .build()
          )
        }
      />
    </>
  );
};
