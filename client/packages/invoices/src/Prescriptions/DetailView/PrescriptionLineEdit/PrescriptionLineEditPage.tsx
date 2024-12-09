import React, { useEffect, useMemo } from 'react';
import {
  BasicSpinner,
  DateUtils,
  DetailContainer,
  InvoiceNodeStatus,
  NothingHere,
  RouteBuilder,
  Typography,
  useBreadcrumbs,
  useParams,
} from '@openmsupply-client/common';

import { ListItems } from '@openmsupply-client/system';
// import { ResponseLineEdit } from './ResponseLineEdit';
import { AppRoute } from '@openmsupply-client/config';
import { PageLayout } from './PageLayout';
import { usePrescription, usePrescriptionLines } from '../../api';
import { useDraftPrescriptionLines } from './hooks';
// import { AppBarButtons } from './AppBarButtons';
// import { PageLayout } from '../PageLayout';

export const PrescriptionLineEditPage = () => {
  const { invoiceNumber, itemId } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const {
    query: { data },
    isDisabled,
  } = usePrescription();
  const {
    status = InvoiceNodeStatus.New,
    id: invoiceId = '',
    prescriptionDate,
  } = data ?? {};

  const lines =
    data?.lines.nodes.sort((a, b) => a.item.name.localeCompare(b.item.name)) ??
    [];

  let currentItem = lines.find(line => line.item.id === itemId)?.item;

  let items = useMemo(() => {
    return [...new Set(data?.lines.nodes.map(line => line.item))];
  }, [data]);

  const {
    draftStockOutLines: draftPrescriptionLines,
    updateQuantity,
    setDraftStockOutLines,
    isLoading,
    updateNotes,
  } = useDraftPrescriptionLines(
    currentItem ?? null,
    DateUtils.getDateOrNull(prescriptionDate)
  );
  const {
    save: { saveLines, isSavingLines },
  } = usePrescriptionLines();

  //   const { hasNext, next, hasPrevious, previous } = usePreviousNextResponseLine(
  //     lines,
  //     currentItem
  //   );

  const enteredLineIds = lines
    .filter(line => line.numberOfPacks !== 0)
    .map(line => line.item.id);

  useEffect(() => {
    setCustomBreadcrumbs({
      2: currentItem?.name || '',
    });
  }, [currentItem]);

  //   if (isLoading || !currentItem) return <BasicSpinner />;
  //   if (!data) return <NothingHere />;

  return (
    <>
      {/* <AppBarButtons requisitionNumber={data?.requisitionNumber} /> */}
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
              <Typography variant="h5">PrescriptionLineEdit</Typography>
            </>
          }
        />
      </DetailContainer>
    </>
  );
};
