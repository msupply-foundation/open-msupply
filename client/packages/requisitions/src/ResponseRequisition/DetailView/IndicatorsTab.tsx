import React from 'react';
import {
  Box,
  ButtonWithIcon,
  DataTableSkeleton,
  IndicatorLineRowNode,
  NothingHere,
  PlusCircleIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { ProgramIndicatorFragment, ResponseFragment } from '../api';

interface IndicatorTabProps {
  onClick: (
    programIndicator?: ProgramIndicatorFragment,
    indicatorLine?: IndicatorLineRowNode,
    response?: ResponseFragment
  ) => void;
  isLoading: boolean;
  response?: ResponseFragment;
  indicators?: ProgramIndicatorFragment[];
}

export const IndicatorsTab = ({
  onClick,
  isLoading,
  response,
  indicators,
}: IndicatorTabProps) => {
  const t = useTranslation();
  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (!indicators || indicators.length === 0) {
    return <NothingHere body={t('error.no-indicators')} />;
  }

  const regimenIndicators = indicators.filter(
    indicator =>
      indicator.code === 'REGIMEN' &&
      // Should only include indicators if they have at least one column with a value
      indicator.lineAndColumns.some(line => line.columns.some(c => c.value))
  );

  const firstRegimenLine = regimenIndicators[0]?.lineAndColumns.sort(
    (a, b) => a.line.lineNumber - b.line.lineNumber
  )[0]?.line;

  const hivIndicators = indicators.filter(
    indicator =>
      indicator.code === 'HIV' &&
      // Should only include indicators if they have at least one column with a value
      indicator.lineAndColumns.some(line => line.columns.some(c => c.value))
  );
  const firstHivLine = hivIndicators[0]?.lineAndColumns.sort(
    (a, b) => a.line.lineNumber - b.line.lineNumber
  )[0]?.line;

  return (
    <Box display="flex" flexDirection="column" padding={2} gap={2}>
      {regimenIndicators.length > 0 && (
        <ButtonWithIcon
          // disabled={disableAddButton}
          label={t('button.regimen')}
          Icon={<PlusCircleIcon />}
          onClick={() =>
            onClick(regimenIndicators[0], firstRegimenLine, response)
          }
        />
      )}
      {hivIndicators.length > 0 && (
        <ButtonWithIcon
          // disabled={disableAddButton}
          label={t('button.hiv')}
          Icon={<PlusCircleIcon />}
          onClick={() => onClick(hivIndicators[0], firstHivLine, response)}
        />
      )}
    </Box>
  );
};
