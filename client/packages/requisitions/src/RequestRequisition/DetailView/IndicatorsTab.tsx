import React from 'react';
import {
  Box,
  useAuthContext,
  useWindowDimensions,
} from '@openmsupply-client/common';
import { IndicatorsTab as SharedIndicatorsTab } from '../../common/IndicatorEdit';
import { ProgramIndicatorFragment, useRequest } from '../api';
import { CustomerIndicatorInfoView } from './CustomerIndicatorInfo';

interface IndicatorTabProps {
  isLoading: boolean;
  indicators?: ProgramIndicatorFragment[];
  disabled: boolean;
}

export const IndicatorsTab = (props: IndicatorTabProps) => {
  const { store } = useAuthContext();
  const { width } = useWindowDimensions();
  const showCustomerInfo =
    !!store?.preferences.useConsumptionAndStockFromCustomersForInternalOrders &&
    !!store?.preferences?.extraFieldsInRequisition;

  return (
    <SharedIndicatorsTab
      {...props}
      useUpdateIndicatorValue={useRequest.document.updateIndicatorValue}
      belowInputs={
        showCustomerInfo
          ? (columns, currentLine) =>
              currentLine.customerIndicatorInfo?.length ? (
                <Box
                  paddingTop={1}
                  maxHeight={200}
                  width={width * 0.48}
                  display="flex"
                >
                  <CustomerIndicatorInfoView
                    columns={columns}
                    customerInfos={currentLine.customerIndicatorInfo}
                  />
                </Box>
              ) : null
          : undefined
      }
    />
  );
};
