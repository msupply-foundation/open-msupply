import { useAuthContext } from '@openmsupply-client/common';

export const useRequisitionPreferences = () => {
  const { store } = useAuthContext();

  const authoriseResponseRequisitions =
    !!store?.preferences?.responseRequisitionRequiresAuthorisation;

  return { authoriseResponseRequisitions };
};
