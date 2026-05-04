import React, { useRef } from 'react';
import {
  DetailContainer,
  IndicatorColumnNode,
  NothingHere,
  TableSkeleton,
  useTranslation,
  useUrlQuery,
} from '@openmsupply-client/common';
import {
  IndicatorLineWithColumnsFragment,
  ProgramIndicatorFragment,
} from '../../RequestRequisition/api';
import { PageLayout } from '../PageLayout';
import { ListIndicatorLines } from '../ListIndicators';
import { mergeIndicatorLines } from './mergeIndicatorLines';
import { IndicatorLineEdit } from './IndicatorLineEdit';
import { UseUpdateIndicatorValue, usePreviousNextIndicatorLine } from './hooks';

interface IndicatorTabProps {
  isLoading: boolean;
  indicators?: ProgramIndicatorFragment[];
  disabled: boolean;
  useUpdateIndicatorValue: UseUpdateIndicatorValue;
  belowInputs?: (
    columns: IndicatorColumnNode[],
    currentLine: IndicatorLineWithColumnsFragment
  ) => React.ReactNode;
}

const INDICATOR_LINE_QUERY_KEY = 'indicatorLine';

export const IndicatorsTab = ({
  isLoading,
  indicators,
  disabled,
  useUpdateIndicatorValue,
  belowInputs,
}: IndicatorTabProps) => {
  const t = useTranslation();
  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: [INDICATOR_LINE_QUERY_KEY],
  });

  // Merge lines across all indicator codes (e.g. HIV + REGIMEN) so the user
  // sees all indicators together rather than split across buttons. Lines with
  // the same code (one per indicator) are collapsed into a single entry with
  // columns from both indicators combined, base-indicator columns first.
  const linesAndColumns = mergeIndicatorLines(indicators ?? []);
  // Values are fetched via loader; a line only appears if at least one column
  // has a value for it.
  const populatedLinesAndColumns = linesAndColumns
    .filter(l => l.columns.some(c => c.value))
    .sort((a, b) => a.line.lineNumber - b.line.lineNumber);
  const sortedLines = populatedLinesAndColumns.map(l => l.line);

  const queryLineId = urlQuery[INDICATOR_LINE_QUERY_KEY] as string | undefined;
  const activeLineId =
    sortedLines.find(l => l.id === queryLineId)?.id ?? sortedLines[0]?.id;
  const currentLineAndColumns = populatedLinesAndColumns.find(
    l => l.line.id === activeLineId
  );
  const currentLine = currentLineAndColumns?.line;

  const { hasNext, next, hasPrevious, previous } = usePreviousNextIndicatorLine(
    sortedLines,
    currentLine
  );

  // This ref is attached to the currently selected list item, and is used to
  // "scroll into view" when the Previous/Next buttons are clicked.
  const scrollRef = useRef<null | HTMLLIElement>(null);
  const scrollSelectedItemIntoView = () =>
    // Small delay so the ref has switched to the new item before scrolling.
    setTimeout(() => scrollRef.current?.scrollIntoView(), 100);

  const onSelectLine = (id: string) =>
    updateQuery({ [INDICATOR_LINE_QUERY_KEY]: id });

  if (isLoading) {
    return <TableSkeleton />;
  }
  if (sortedLines.length === 0) {
    return <NothingHere body={t('error.no-indicators')} />;
  }

  return (
    <DetailContainer>
      <PageLayout
        Left={
          <ListIndicatorLines
            currentIndicatorLineId={activeLineId ?? ''}
            lines={sortedLines}
            onClick={onSelectLine}
            scrollRef={scrollRef}
          />
        }
        Right={
          <IndicatorLineEdit
            currentLine={currentLineAndColumns}
            hasNext={hasNext}
            next={next}
            hasPrevious={hasPrevious}
            previous={previous}
            disabled={disabled}
            onSelectLine={onSelectLine}
            scrollIntoView={scrollSelectedItemIntoView}
            useUpdateIndicatorValue={useUpdateIndicatorValue}
            belowInputs={belowInputs}
          />
        }
      />
    </DetailContainer>
  );
};
