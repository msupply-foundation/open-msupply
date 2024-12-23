import React, { useEffect } from 'react';
import {
  BasicSpinner,
  DetailContainer,
  NothingHere,
  RouteBuilder,
  useBreadcrumbs,
  useParams,
} from '@openmsupply-client/common';
import { useResponse } from '../../api';
import { ListItems } from '@openmsupply-client/system';
import { ResponseLineEdit } from './ResponseLineEdit';
import { AppRoute } from '@openmsupply-client/config';
import { useDraftRequisitionLine, usePreviousNextResponseLine } from './hooks';
import { AppBarButtons } from './AppBarButtons';
import { PageLayout } from '../../../PageLayout';

export const ResponseLineEditPage = () => {
  const { itemId } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { data, isLoading } = useResponse.document.get();
  const lines =
    data?.lines.nodes.sort((a, b) => a.item.name.localeCompare(b.item.name)) ??
    [];
  const currentItem = lines.find(l => l.item.id === itemId)?.item;
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

  if (isLoading || !currentItem) return <BasicSpinner />;
  if (!data) return <NothingHere />;

  return (
    <>
      <AppBarButtons requisitionNumber={data?.requisitionNumber} />
      <DetailContainer>
        <PageLayout
          Left={
            <>
              <ListItems
                currentItemId={itemId}
                items={lines.map(l => l.item)}
                route={RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.CustomerRequisition)
                  .addPart(String(data?.requisitionNumber))}
                enteredLineIds={enteredLineIds}
              />
            </>
          }
          Right={
            <>
              <ResponseLineEdit
                item={currentItem}
                hasLinkedRequisition={!!data?.linkedRequisition}
                draft={draft}
                update={update}
                save={save}
                hasNext={hasNext}
                next={next}
                hasPrevious={hasPrevious}
                previous={previous}
                isProgram={!!data?.programName}
              />
            </>
          }
        />
      </DetailContainer>
    </>
  );
};
