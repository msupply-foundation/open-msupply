import { useMutation } from '@openmsupply-client/common';
import { useAllocateNumberApi } from '../utils/useAllocateNumberApi';

export const useAllocateNumber = () => {
  const api = useAllocateNumberApi();
  return useMutation(api.allocateNumber);
};
