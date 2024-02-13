import { useQueryClient, useMutation } from '@openmsupply-client/common';
import { useInboundApi } from '../utils/useInboundApi';

export const useInsertSupplierReturn = () => {
  const queryClient = useQueryClient();
  // const navigate = useNavigate();
  const api = useInboundApi();
  return useMutation(api.insertSupplierReturn, {
    onSuccess: () => {
      // TODO: redirect to details page
      // onSuccess: invoiceNumber => {
      // const route = RouteBuilder.create(AppRoute.Replenishment)
      //   .addPart(AppRoute.InboundShipment)
      //   .addPart(String(invoiceNumber))
      //   .build();
      // navigate(route, { replace: true });
      return queryClient.invalidateQueries(api.keys.base());
    },
  });
};
