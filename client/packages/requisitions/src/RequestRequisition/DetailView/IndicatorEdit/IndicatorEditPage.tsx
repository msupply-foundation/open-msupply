import React, { useEffect } from 'react';
import {
  BasicSpinner,
  DetailContainer,
  NothingHere,
  RouteBuilder,
  useBreadcrumbs,
  useParams,
  useTranslation,
} from '@openmsupply-client/common';
import { PageLayout } from '../../../common/PageLayout';
import { AppRoute } from '@openmsupply-client/config';
import { usePreviousNextIndicatorLine } from './hooks';
import { IndicatorLineEdit } from './IndicatorLineEdit';
import { useRequest } from '../..';
import { AppBarButtons } from '../RequestLineEdit/AppBarButtons';
import { ListIndicatorLines } from '../../../common/ListIndicators';

export const IndicatorEditPage = () => {
  const t = useTranslation();
  const { programIndicatorLineId, programIndicatorCode } = useParams();
  const { data: request, isLoading } = useRequest.document.get();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const isDisabled = useRequest.utils.isDisabled();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useRequest.document.indicators(
      request?.otherPartyId ?? '',
      request?.period?.id ?? '',
      request?.program?.id ?? '',
      !!request
    );

  const indicators = programIndicators?.nodes.filter(
    indicator => indicator?.code === programIndicatorCode
  );

  const linesAndColumns =
    indicators?.flatMap(indicator => indicator.lineAndColumns) ?? [];
  const currentLineAndColumns = linesAndColumns.find(
    l => l.line.id == programIndicatorLineId
  );
  // Should only include indicators if they have at least one column with a value
  // Filtering for !value done on FE because values are queried via loader
  const populatedLines = linesAndColumns.filter(l =>
    l.columns.find(c => c.value)
  );
  const lines = populatedLines.map(l => l.line);
  const currentLine = lines.find(l => l.id === programIndicatorLineId);
  const sortedLines = lines.sort((a, b) => a.lineNumber - b.lineNumber);
  const customerInfos = indicators?.map(
    indicator => indicator.customerIndicatorInfo
  );
  const currentLineCustomerInfos = customerInfos?.flatMap(customerInfo =>
    customerInfo?.filter(info => info?.lineId === currentLine?.id)
  );

  const { hasNext, next, hasPrevious, previous } = usePreviousNextIndicatorLine(
    sortedLines,
    currentLine
  );

  useEffect(() => {
    setCustomBreadcrumbs(
      {
        2: t('label.indicators'),
        4: `${currentLine?.name}: ${currentLine?.code}`,
      },
      [2, 3]
    );
  }, [programIndicatorLineId]);

  if (isLoading || isProgramIndicatorsLoading) {
    return <BasicSpinner />;
  }
  if (!request) {
    return <NothingHere />;
  }

  return (
    <>
      <AppBarButtons requisitionNumber={request?.requisitionNumber} />
      <DetailContainer>
        <PageLayout
          Left={
            <>
              <ListIndicatorLines
                currentIndicatorLineId={programIndicatorLineId ?? ''}
                lines={sortedLines}
                route={RouteBuilder.create(AppRoute.Replenishment)
                  .addPart(AppRoute.InternalOrder)
                  .addPart(String(request?.requisitionNumber))
                  .addPart(AppRoute.Indicators)
                  .addPart(String(programIndicatorCode))}
              />
            </>
          }
          Right={
            <>
              <IndicatorLineEdit
                currentLine={currentLineAndColumns}
                hasNext={hasNext}
                next={next}
                hasPrevious={hasPrevious}
                previous={previous}
                requisitionNumber={request?.requisitionNumber}
                disabled={isDisabled}
                customerInfos={currentLineCustomerInfos}
              />
            </>
          }
        />
      </DetailContainer>
    </>
  );
};
