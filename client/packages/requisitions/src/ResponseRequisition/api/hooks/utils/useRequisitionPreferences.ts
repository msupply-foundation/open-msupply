import { useAuthContext } from '@openmsupply-client/common';

export const useRequisitionPreferences = () => {
  const { store } = useAuthContext();

  const authoriseCustomerRequisitions =
    !!store?.preferences?.responseRequisitionRequiresAuthorisation;

  return { authoriseCustomerRequisitions };
};
