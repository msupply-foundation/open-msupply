import React, { useEffect, useRef } from 'react';
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
import { PageLayout } from '../../../common/PageLayout';
import { AppRoute } from '@openmsupply-client/config';
import { AppBarButtons } from '../ResponseLineEdit/AppBarButtons';
import { usePreviousNextIndicatorLine } from './hooks';
import { IndicatorLineEdit } from './IndicatorLineEdit';
import { ListIndicatorLines } from '../../../common';

export const IndicatorEditPage = () => {
  const t = useTranslation();
  const { programIndicatorLineId, programIndicatorCode } = useParams();
  const { data: response, isLoading } = useResponse.document.get();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const isDisabled = useResponse.utils.isDisabled();
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
  // Should only include indicators if they have at least one column with a value
  // Filtering for !value done on FE because values are queried via loader
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
        4: `${currentLine?.name}: ${currentLine?.code}`,
      },
      [2, 3]
    );
  }, [programIndicatorLineId, programIndicators]);

  // This ref is attached to the currently selected list item, and is used to
  // "scroll into view" when the Previous/Next buttons are clicked in the NavBar
  const scrollRef = useRef<null | HTMLLIElement>(null);
  const scrollSelectedItemIntoView = () =>
    // Small time delay to allow the ref to change to the previous/next item in
    // the list before scrolling to it
    setTimeout(() => scrollRef.current?.scrollIntoView(), 100);

  if (isLoading || isProgramIndicatorsLoading) {
    return <BasicSpinner />;
  }
  if (!response) {
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
                scrollRef={scrollRef}
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
                disabled={isDisabled}
                scrollIntoView={scrollSelectedItemIntoView}
              />
            </>
          }
        />
      </DetailContainer>
    </>
  );
};
