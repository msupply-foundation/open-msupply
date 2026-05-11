import React from 'react';
import { IndicatorsTab as SharedIndicatorsTab } from '../../../common/IndicatorEdit';
import { ProgramIndicatorFragment } from '../../../RequestRequisition/api';
import { useResponse } from '../../api';

interface IndicatorTabProps {
  isLoading: boolean;
  indicators?: ProgramIndicatorFragment[];
  disabled: boolean;
}

export const IndicatorsTab = (props: IndicatorTabProps) => (
  <SharedIndicatorsTab
    {...props}
    useUpdateIndicatorValue={useResponse.document.updateIndicatorValue}
  />
);
