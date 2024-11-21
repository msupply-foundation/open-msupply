import React from 'react';
import {
  Box,
  ButtonWithIcon,
  IndicatorLineRowNode,
  NothingHere,
  PlusCircleIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { ProgramIndicatorFragment, ResponseFragment } from '../api';

interface IndicatorTabProps {
  onClick: (
    indicatorLine: IndicatorLineRowNode | undefined,
    response: ResponseFragment | undefined
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
    return <NothingHere body="There are no indicators for this requisition" />;
  }
  const hivIndicators = indicators?.filter(
    indicator => indicator?.code === 'HIV'
  );
  const regimenIndicators = indicators?.filter(
    indicator => indicator?.code === 'REGIMEN'
  );

  return (
    <Box display="flex" flexDirection="column" padding={2} gap={2}>
      <ButtonWithIcon
        // disabled={disableAddButton}
        label={t('button.regimen')}
        Icon={<PlusCircleIcon />}
        onClick={() =>
          onClick(regimenIndicators?.[0]?.lineAndColumns[0]?.line, response)
        }
      />
      <ButtonWithIcon
        // disabled={disableAddButton}
        label={t('button.hiv')}
        Icon={<PlusCircleIcon />}
        onClick={() =>
          onClick(hivIndicators?.[0]?.lineAndColumns[0]?.line, response)
        }
      />
    </Box>
  );
};
