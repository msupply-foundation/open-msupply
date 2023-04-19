import { useAuthContext } from '@openmsupply-client/common';

export const useRequisitionPreferences = () => {
  const { store } = useAuthContext();

  const requireSupplierAuthorisation =
    !!store?.preferences?.requestRequisitionRequiresAuthorisation;

  return { requireSupplierAuthorisation };
};
