import React, { useEffect } from 'react';
import {
  BasicSpinner,
  DetailContainer,
  NothingHere,
  RouteBuilder,
  useBreadcrumbs,
  useParams,
} from '@openmsupply-client/common';
import { useRequest } from '../../api';
import { ListItems } from '@openmsupply-client/system';
import { AppRoute } from '@openmsupply-client/config';
import { useDraftRequisitionLine, usePreviousNextRequestLine } from './hooks';
import { PageLayout } from '../../../PageLayout';
import { AppBarButtons } from './AppBarButtons';
import { RequestLineEdit } from './RequestLineEdit';

export const RequestLineEditPage = () => {
  const { requisitionNumber, itemId } = useParams();
  const { data, isLoading: requestIsLoading } = useRequest.document.get();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { lines } = useRequest.line.list();
  const currentItem = lines?.find(l => l.item.id === itemId)?.item;
  const { draft, save, update, isLoading } =
    useDraftRequisitionLine(currentItem);
  const { hasNext, next, hasPrevious, previous } = usePreviousNextRequestLine(
    lines,
    currentItem
  );
  const enteredLineIds = lines
    ? lines
        .filter(line => line.requestedQuantity !== 0)
        .map(line => line.item.id)
    : [];

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
            <>
              <ListItems
                currentItemId={itemId}
                items={lines?.map(l => l.item)}
                route={RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InternalOrder)
                  .addPart(String(requisitionNumber))}
                enteredLineIds={enteredLineIds}
              />
            </>
          }
          Right={
            <>
              <RequestLineEdit
                item={currentItem}
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
