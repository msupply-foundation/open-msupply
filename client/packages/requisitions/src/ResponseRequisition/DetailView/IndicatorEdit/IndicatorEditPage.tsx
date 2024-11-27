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
import { useResponse } from '../../api';
import { PageLayout } from '../PageLayout';
import { ListIndicatorLines } from './ListIndicators';
import { AppRoute } from '@openmsupply-client/config';
import { AppBarButtons } from '../ResponseLineEdit/AppBarButtons';
import { usePreviousNextIndicatorLine } from './hooks';
import { IndicatorLineEdit } from './IndicatorLineEdit';

export const IndicatorEditPage = () => {
  const t = useTranslation();
  const { programIndicatorLineId, programIndicatorCode } = useParams();
  const { data: response, isLoading } = useResponse.document.get();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useResponse.document.indicators(
      response?.otherPartyId ?? '',
      response?.period?.id ?? '',
      response?.program?.id ?? '',
      !!response
    );

  const indicators = programIndicators?.nodes.filter(
    indicator => indicator?.code === programIndicatorCode
  );

  const linesAndColumns =
    indicators?.flatMap(indicator => indicator.lineAndColumns) ?? [];
  const currentLineAndColumns = linesAndColumns.find(
    l => l.line.id == programIndicatorLineId
  );
  // Lines may be added to a program_indicator after the requisition was made. We need to hide them, as they're not valid or necessary for past requisitions.
  const populatedLines = linesAndColumns.filter(l =>
    l.columns.find(c => c.value)
  );
  const lines = populatedLines.map(l => l.line);
  const currentLine = lines.find(l => l.id === programIndicatorLineId);
  const sortedLines = lines.sort((a, b) => a.lineNumber - b.lineNumber);

  const { hasNext, next, hasPrevious, previous } = usePreviousNextIndicatorLine(
    sortedLines,
    currentLine
  );

  useEffect(() => {
    setCustomBreadcrumbs(
      {
        2: t('label.indicators'),
        4: currentLine?.code || '',
      },
      [2, 3]
    );
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
                lines={sortedLines}
                route={RouteBuilder.create(AppRoute.Distribution)
                  .addPart(AppRoute.CustomerRequisition)
                  .addPart(String(response?.requisitionNumber))
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
                requisitionNumber={response?.requisitionNumber}
              />
            </>
          }
        />
      </DetailContainer>
    </>
  );
};
