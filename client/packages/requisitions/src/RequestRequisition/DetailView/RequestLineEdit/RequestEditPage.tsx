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
import { RequestFragment, useRequest } from '../../api';
import { ListItems } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { useDraftRequisitionLine, usePreviousNextRequestLine } from './hooks';
import { PageLayout } from '../../../common/PageLayout';
import { AppBarButtons } from './AppBarButtons';
import { RequestLineEdit } from './RequestLineEdit';

interface RequestLineEditPageInnerProps {
  itemId: string;
  requisition: RequestFragment;
}

export const RequestLineEditPage = () => {
  const { itemId } = useParams();
  const { data, isLoading } = useRequest.document.get();

  if (isLoading || !itemId) return <BasicSpinner />;
  if (!data) return <NothingHere />;

  return <RequestLineEditPageInner requisition={data} itemId={itemId} />;
};

export const RequestLineEditPageInner = ({
  itemId,
  requisition,
}: RequestLineEditPageInnerProps) => {
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { mutateAsync } = useRequest.line.insert();

  const lines = requisition.lines.nodes.sort((a, b) =>
    a.item.name.localeCompare(b.item.name)
  );
  const currentItem = lines.find(line => line.item.id === itemId)?.item;
  const { draft, save, update } = useDraftRequisitionLine(currentItem);
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
  const isProgram = !!requisition.programName;

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

  return (
    <>
      <AppBarButtons requisitionNumber={requisition.requisitionNumber} />
      <DetailContainer>
        <PageLayout
          Left={
            <ListItems
              currentItemId={itemId}
              items={lines?.map(l => l.item)}
              route={RouteBuilder.create(AppRoute.Replenishment)
                .addPart(AppRoute.InternalOrder)
                .addPart(String(requisition.requisitionNumber))}
              enteredLineIds={enteredLineIds}
              showNew={
                requisition.status !== RequisitionNodeStatus.Sent && !isProgram
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
              requisitionId={requisition?.id ?? ''}
              requisitionNumber={requisition?.requisitionNumber}
              lines={lines}
              scrollIntoView={scrollSelectedItemIntoView}
            />
          }
        />
      </DetailContainer>
    </>
  );
};
