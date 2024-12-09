import React, { useEffect, useMemo } from 'react';
import {
  BasicSpinner,
  DetailContainer,
  NothingHere,
  RouteBuilder,
  useBreadcrumbs,
  useParams,
} from '@openmsupply-client/common';

import { ItemRowFragment, ListItems } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { PageLayout } from './PageLayout';
import { usePrescription } from '../../api';
import { usePreviousNextItem } from './hooks';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { PrescriptionLineEdit } from './PrescriptionLineEdit';

export const PrescriptionLineEditPage = () => {
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
  }, [data]);

  const { hasNext, next, hasPrevious, previous } = usePreviousNextItem(
    items,
    currentItem?.id
  );

  const enteredLineIds = lines
    .filter(line => line.numberOfPacks !== 0)
    .map(line => line.item.id);

  useEffect(() => {
    setCustomBreadcrumbs({
      2: currentItem?.name || '',
    });
  }, [currentItem]);

  if (isLoading || !currentItem) return <BasicSpinner />;
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
              />
            </>
          }
          Right={
            <>
              <PrescriptionLineEdit draft={{ item: currentItem }} mode={null} />
              <Footer
                hasNext={hasNext}
                next={next}
                hasPrevious={hasPrevious}
                previous={previous}
                invoiceNumber={data?.invoiceNumber}
              />
            </>
          }
        />
      </DetailContainer>
    </>
  );
};
