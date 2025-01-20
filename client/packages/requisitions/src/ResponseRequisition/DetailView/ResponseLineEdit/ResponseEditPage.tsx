import React, { useEffect, useRef } from 'react';
import {
  BasicSpinner,
  DetailContainer,
  NothingHere,
  RequisitionNodeStatus,
  RouteBuilder,
  useBreadcrumbs,
  useParams,
} from '@openmsupply-client/common';
import { ResponseFragment, useResponse } from '../../api';
import { ListItems } from '@openmsupply-client/system';
import { ResponseLineEdit } from './ResponseLineEdit';
import { AppRoute } from '@openmsupply-client/config';
import { useDraftRequisitionLine, usePreviousNextResponseLine } from './hooks';
import { AppBarButtons } from './AppBarButtons';
import { PageLayout } from '../../../common/PageLayout';

interface ResponseLineEditPageInnerProps {
  itemId: string;
  requisition: ResponseFragment;
}

export const ResponseLineEditPage = () => {
  const { itemId } = useParams();
  const { data, isLoading } = useResponse.document.get();

  if (isLoading || !itemId) return <BasicSpinner />;
  if (!data) return <NothingHere />;

  return <ResponseLineEditPageInner requisition={data} itemId={itemId} />;
};

const ResponseLineEditPageInner = ({
  itemId,
  requisition,
}: ResponseLineEditPageInnerProps) => {
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { mutateAsync } = useResponse.line.insert();

  const lines = requisition.lines.nodes.sort((a, b) =>
    a.item.name.localeCompare(b.item.name)
  );
  const currentItem = lines.find(line => line.item.id === itemId)?.item;
  const { draft, update, save } = useDraftRequisitionLine(currentItem);
  const { hasNext, next, hasPrevious, previous } = usePreviousNextResponseLine(
    lines,
    currentItem
  );
  const enteredLineIds = lines
    .filter(line => line.supplyQuantity !== 0)
    .map(line => line.item.id);
  const isProgram = !!requisition.programName;

  useEffect(() => {
    setCustomBreadcrumbs({
      2: currentItem?.name || '',
    });
  }, [currentItem]);

  // This ref is attached to the currently selected list item, and is used to
  // "scroll into view" when the Previous/Next buttons are clicked in the NavBar
  const scrollRef = useRef<null | HTMLLIElement>(null);
  const scrollSelectedItemIntoView = () =>
    // Small time delay to allow the ref to change to the previous/next item in
    // the list before scrolling to it
    setTimeout(() => scrollRef.current?.scrollIntoView(), 100);

  return (
    <>
      <AppBarButtons requisitionNumber={requisition.requisitionNumber} />
      <DetailContainer>
        <PageLayout
          Left={
            <ListItems
              currentItemId={itemId}
              items={lines.map(line => line.item)}
              route={RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.CustomerRequisition)
                .addPart(String(requisition.requisitionNumber))}
              enteredLineIds={enteredLineIds}
              showNew={
                requisition.status !== RequisitionNodeStatus.Finalised &&
                !isProgram
              }
              scrollRef={scrollRef}
            />
          }
          Right={
            <ResponseLineEdit
              hasLinkedRequisition={!!requisition.linkedRequisition}
              draft={draft}
              update={update}
              save={save}
              hasNext={hasNext}
              next={next}
              hasPrevious={hasPrevious}
              previous={previous}
              isProgram={!!isProgram}
              lines={lines}
              requisitionNumber={requisition.requisitionNumber}
              requisitionId={requisition.id}
              insert={mutateAsync}
              scrollIntoView={scrollSelectedItemIntoView}
            />
          }
        />
      </DetailContainer>
    </>
  );
};
