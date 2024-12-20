import React, { useEffect } from 'react';
import {
  BasicSpinner,
  DetailContainer,
  NothingHere,
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
import { PageLayout } from '../PageLayout';

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
            <>
              <ListItems
                currentItemId={itemId}
                items={lines.map(line => line.item)}
                route={RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.CustomerRequisition)
                  .addPart(String(requisition.requisitionNumber))}
                enteredLineIds={enteredLineIds}
              />
            </>
          }
          Right={
            <>
              <ResponseLineEdit
                item={currentItem}
                hasLinkedRequisition={!!requisition.linkedRequisition}
                draft={draft}
                update={update}
                save={save}
                hasNext={hasNext}
                next={next}
                hasPrevious={hasPrevious}
                previous={previous}
                isProgram={!!requisition.programName}
              />
            </>
          }
        />
      </DetailContainer>
    </>
  );
};
