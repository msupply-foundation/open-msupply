import {
  RouteBuilder,
  useNavigate,
  useMutation,
  useQueryClient,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { usePrescriptionApi } from '../../utils/usePrescriptionApi';

export const usePrescriptionInsert = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = usePrescriptionApi();
  return useMutation(api.insert, {
    onSuccess: invoiceNumber => {
      const route = RouteBuilder.create(AppRoute.Dispensary)
        .addPart(AppRoute.Prescription)
        .addPart(String(invoiceNumber))
        .build();
      navigate(route, { replace: true });
      queryClient.invalidateQueries(api.keys.base());
    },
  });
};
