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
    indicator => indicator.code === 'REGIMEN'
  );
  const hivIndicators = indicators.filter(
    indicator => indicator.code === 'HIV'
  );

  return (
    <Box display="flex" flexDirection="column" padding={2} gap={2}>
      {regimenIndicators.length >= 0 && (
        <ButtonWithIcon
          // disabled={disableAddButton}
          label={t('button.regimen')}
          Icon={<PlusCircleIcon />}
          onClick={() =>
            onClick(
              regimenIndicators[0],
              regimenIndicators[0]?.lineAndColumns[0]?.line,
              response
            )
          }
        />
      )}
      {hivIndicators.length >= 0 && (
        <ButtonWithIcon
          // disabled={disableAddButton}
          label={t('button.hiv')}
          Icon={<PlusCircleIcon />}
          onClick={() =>
            onClick(
              hivIndicators[0],
              hivIndicators[0]?.lineAndColumns[0]?.line,
              response
            )
          }
        />
      )}
    </Box>
  );
};
