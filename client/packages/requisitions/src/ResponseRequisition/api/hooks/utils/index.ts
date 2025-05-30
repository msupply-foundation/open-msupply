import { useCreateOutboundFromResponse } from './useCreateOutboundFromResponse';
import { useIsResponseDisabled } from './useIsResponseDisabled';
import { useResponseApi } from './useResponseApi';
import { useSupplyRequestedQuantity } from './useSupplyRequestedQuantity';
import { useIsRemoteAuthorisation } from './useIsRemoteAuthorisation';
import { useRequisitionPreferences } from './useRequisitionPreferences';
import { useIsDisabledByAuthorisation } from './useIsDisabledByAuthorisation';
import { useProgramRequisitionSettingsByCustomer } from './useProgramRequisitionSettingsByCustomer';

export const Utils = {
  useCreateOutboundFromResponse,
  useIsResponseDisabled,
  useResponseApi,
  useIsRemoteAuthorisation,
  useSupplyRequestedQuantity,
  useRequisitionPreferences,
  useIsDisabledByAuthorisation,
  useProgramRequisitionSettingsByCustomer,
};
