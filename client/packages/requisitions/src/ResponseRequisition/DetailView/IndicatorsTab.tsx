import React from 'react';
import {
  ButtonWithIcon,
  IndicatorLineRowNode,
  NothingHere,
  PlusCircleIcon,
  // useTranslation,
} from '@openmsupply-client/common';
import { ResponseFragment, useResponse } from '../api';

interface IndicatorTabProps {
  onClick: (
    indicatorLine: IndicatorLineRowNode | undefined,
    response: ResponseFragment | undefined
  ) => void;
  isLoading: boolean;
  response?: ResponseFragment;
}

export const IndicatorsTab = ({
  onClick,
  isLoading,
  response,
}: IndicatorTabProps) => {
  // const t = useTranslation();
  const { data } = useResponse.document.indicators(
    response?.otherPartyId || '',
    response?.period?.id || ''
  );
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
          onClick(
            data?.programIndicators.nodes[0]?.lineAndColumns[0]?.line,
            response
          )
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
