import React, { useEffect, useRef, useState } from 'react';
import {
  BasicSpinner,
  DetailContainer,
  NothingHere,
  RequisitionNodeStatus,
  RouteBuilder,
  useBreadcrumbs,
  useParams,
} from '@openmsupply-client/common';
import { useRequest } from '../../api';
import { ListItems } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { useDraftRequisitionLine, usePreviousNextRequestLine } from './hooks';
import { PageLayout } from '../../../common/PageLayout';
import { AppBarButtons } from './AppBarButtons';
import { RequestLineEdit } from './RequestLineEdit';

export const RequestLineEditPage = () => {
  const { requisitionNumber, itemId } = useParams();
  const { data, isLoading: requestIsLoading } = useRequest.document.get();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { mutateAsync } = useRequest.line.insert();
  const { lines } = useRequest.line.list();
  const currentItem = lines?.find(l => l.item.id === itemId)?.item;
  const { draft, save, update, isLoading } =
    useDraftRequisitionLine(currentItem);
  const { hasNext, next, hasPrevious, previous } = usePreviousNextRequestLine(
    lines,
    currentItem
  );
  const isPacksEnabled = !!draft?.defaultPackSize;
  const [isPacks, setIsPacks] = useState(isPacksEnabled);
  const enteredLineIds = lines
    ? lines
        .filter(line => line.requestedQuantity !== 0)
        .map(line => line.item.id)
    : [];
  const isProgram = !!data?.programName;

  // This ref is attached to the currently selected list item, and is used to
  // "scroll into view" when the Previous/Next buttons are clicked in the NavBar
  const scrollRef = useRef<null | HTMLLIElement>(null);
  const scrollSelectedItemIntoView = () =>
    // Small time delay to allow the ref to change to the previous/next item in
    // the list before scrolling to it
    setTimeout(() => scrollRef.current?.scrollIntoView(), 100);

  useEffect(() => {
    setCustomBreadcrumbs({
      2: currentItem?.name || '',
    });
  }, [currentItem]);

  if (isLoading || requestIsLoading) return <BasicSpinner />;
  if (!lines) return <NothingHere />;

  return (
    <>
      <AppBarButtons requisitionNumber={Number(requisitionNumber)} />
      <DetailContainer>
        <PageLayout
          Left={
            <ListItems
              currentItemId={itemId}
              items={lines?.map(l => l.item)}
              route={RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InternalOrder)
                .addPart(String(requisitionNumber))}
              enteredLineIds={enteredLineIds}
              showNew={
                data?.status !== RequisitionNodeStatus.Sent && !isProgram
              }
              scrollRef={scrollRef}
            />
          }
          Right={
            <RequestLineEdit
              item={currentItem}
              draft={draft}
              update={update}
              save={save}
              hasNext={hasNext}
              next={next}
              hasPrevious={hasPrevious}
              previous={previous}
              isProgram={isProgram}
              isPacksEnabled={isPacksEnabled}
              isPacks={isPacks}
              setIsPacks={setIsPacks}
              insert={mutateAsync}
              requisitionId={data?.id ?? ''}
              requisitionNumber={data?.requisitionNumber}
              lines={lines}
              scrollIntoView={scrollSelectedItemIntoView}
            />
          }
        />
      </DetailContainer>
    </>
  );
};
