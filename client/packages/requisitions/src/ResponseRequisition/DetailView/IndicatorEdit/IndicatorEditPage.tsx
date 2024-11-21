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
import { PageLayout } from '../PageLayout';
import { ListIndicatorLines } from './ListIndicators';
import { AppRoute } from '@openmsupply-client/config';
import { AppBarButtons } from '../ResponseLineEdit/AppBarButtons';
import { usePreviousNextIndicatorValue } from './hooks';
import { IndicatorLineEdit } from './IndicatorLineEdit';

export const IndicatorEditPage = () => {
  const { programIndicatorLineId } = useParams();
  const { data: response, isLoading } = useResponse.document.get();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useResponse.document.indicators(
      response?.otherPartyId ?? '',
      response?.period?.id ?? ''
    );
  const indicators = programIndicators?.programIndicators.nodes;

  const linesAndColumns =
    indicators?.flatMap(indicator => indicator.lineAndColumns) ?? [];
  const lines = linesAndColumns.map(l => l.line);
  const currentLine = lines.find(l => l.id === programIndicatorLineId);
  const { hasNext, next, hasPrevious, previous } =
    usePreviousNextIndicatorValue(lines, currentLine);

  useEffect(() => {
    setCustomBreadcrumbs({
      2: 'Indicators',
      3: currentLine?.code || '',
    });
  }, [programIndicatorLineId]);

  if (isLoading || isProgramIndicatorsLoading) {
    return <BasicSpinner />;
  }
  if (!programIndicatorLineId || !response) {
    return <NothingHere />;
  }

  return (
    <>
      <AppBarButtons requisitionNumber={response?.requisitionNumber} />
      <DetailContainer>
        <PageLayout
          Left={
            <>
              <ListIndicatorLines
                currentIndicatorLineId={programIndicatorLineId ?? ''}
                lines={lines}
                route={RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.CustomerRequisition)
                  .addPart(String(response?.requisitionNumber))}
              />
            </>
          }
          Right={
            <>
              <IndicatorLineEdit
                hasNext={hasNext}
                next={next}
                hasPrevious={hasPrevious}
                previous={previous}
                requisitionNumber={response?.requisitionNumber}
              />
            </>
          }
        />
      </DetailContainer>
    </>
  );
};
