import React, { useEffect, useMemo } from 'react';
import {
  BasicSpinner,
  DetailContainer,
  ModalMode,
  NothingHere,
  RouteBuilder,
  useBreadcrumbs,
  useParams,
} from '@openmsupply-client/common';

import { ItemRowFragment, ListItems } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { PageLayout } from './PageLayout';
import { usePrescription } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { PrescriptionLineEdit } from './PrescriptionLineEdit';

export const PrescriptionLineEditView = () => {
  const { invoiceNumber, itemId } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const {
    query: { data, loading: isLoading },
  } = usePrescription();

  const lines =
    data?.lines.nodes.sort((a, b) => a.item.name.localeCompare(b.item.name)) ??
    [];

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

  if (isLoading) return <BasicSpinner />;
  if (!data) return <NothingHere />;

  return (
    <>
      <AppBarButtons invoiceNumber={data?.invoiceNumber} />
      <DetailContainer>
        <PageLayout
          Left={
            <>
              <ListItems
                currentItemId={itemId}
                items={items}
                route={RouteBuilder.create(AppRoute.Dispensary)
                  .addPart(AppRoute.Prescription)
                  .addPart(String(invoiceNumber))}
                enteredLineIds={enteredLineIds}
                showNew={true}
              />
            </>
          }
          Right={
            <>
              <PrescriptionLineEdit
                draft={{ item: currentItem }}
                mode={currentItem ? ModalMode.Update : ModalMode.Create}
                items={items}
              />
            </>
          }
        />
      </DetailContainer>
    </>
  );
};
