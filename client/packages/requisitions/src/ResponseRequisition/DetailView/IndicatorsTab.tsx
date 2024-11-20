import React from 'react';
import {
  ButtonWithIcon,
  IndicatorLineRowNode,
  NothingHere,
  PlusCircleIcon,
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
  if (isLoading) {
    return <NothingHere body="There are no indicators for this requisition" />;
  }

  return (
    <>
      <ButtonWithIcon
        // disabled={disableAddButton}
        label={'t(REGIMEN)'}
        Icon={<PlusCircleIcon />}
        onClick={() =>
          onClick(indicators?.[0]?.lineAndColumns[0]?.line, response)
        }
      />
      <ButtonWithIcon
        // disabled={disableAddButton}
        label={'t(HIV)'}
        Icon={<PlusCircleIcon />}
        onClick={() => {}}
      />
    </>
  );
};
