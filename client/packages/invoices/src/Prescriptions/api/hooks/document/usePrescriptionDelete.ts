import {
  RouteBuilder,
  useMutation,
  useNavigate,
  useQueryClient,
} from '@openmsupply-client/common';
import { usePrescriptionApi } from '../utils/usePrescriptionApi';
import { AppRoute } from '@openmsupply-client/config';

export const usePrescriptionDelete = () => {
  const queryClient = useQueryClient();
  const api = usePrescriptionApi();
  const navigate = useNavigate();

  return useMutation(api.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(api.keys.base());
      navigate(
        RouteBuilder.create(AppRoute.Dispensary)
          .addPart(AppRoute.Prescription)
          .build()
      );
    },
  });
};
