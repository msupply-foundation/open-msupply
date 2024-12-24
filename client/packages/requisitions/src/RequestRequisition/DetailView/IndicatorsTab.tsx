import React from 'react';
import {
  Box,
  ButtonWithIcon,
  DataTableSkeleton,
  IndicatorLineRowNode,
  LocaleKey,
  NothingHere,
  PlusCircleIcon,
  useTranslation,
} from '@openmsupply-client/common';
import {
  ProgramIndicatorFragment,
  RequestFragment,
} from '../../RequestRequisition/api';

interface IndicatorTabProps {
  onClick: (
    programIndicator?: ProgramIndicatorFragment,
    indicatorLine?: IndicatorLineRowNode,
    request?: RequestFragment
  ) => void;
  isLoading: boolean;
  request?: RequestFragment;
  indicators?: ProgramIndicatorFragment[];
}

export const IndicatorsTab = ({
  onClick,
  isLoading,
  request,
  indicators,
}: IndicatorTabProps) => {
  const t = useTranslation();
  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (!indicators || indicators.length === 0) {
    return <NothingHere body={t('error.no-indicators')} />;
  }

  const indicatorGroups = indicators.reduce(
    (
      acc: Record<string, ProgramIndicatorFragment[]>,
      indicator: ProgramIndicatorFragment
    ) => {
      if (indicator?.code) {
        if (!acc[indicator.code]) {
          acc[indicator.code] = [];
        }
        acc[indicator.code]?.push(indicator);
      }
      return acc;
    },
    {}
  );

  return (
    <Box display="flex" flexDirection="column" padding={2} gap={2}>
      {Object.entries(indicatorGroups).map(([code, groupIndicators]) => {
        const firstLine = groupIndicators[0]?.lineAndColumns.sort(
          (a, b) => a.line.lineNumber - b.line.lineNumber
        )[0]?.line;
        return (
          <ButtonWithIcon
            key={code}
            label={t(`button.${code.toLowerCase()}` as LocaleKey)}
            Icon={<PlusCircleIcon />}
            onClick={() => onClick(groupIndicators[0], firstLine, request)}
          />
        );
      })}
    </Box>
  );
};
