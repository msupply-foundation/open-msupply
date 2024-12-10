import {
  RouteBuilder,
  useMatch,
  useParams,
  useQuery,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { useState } from 'react';
import { CustomerReturnFragment } from '../../operations.generated';
import { AppRoute } from '@openmsupply-client/config/src';

export const useCustomerReturn = () => {
  const isCustomerReturnPage = useMatch(
    RouteBuilder.create(AppRoute.Distribution)
      .addPart(AppRoute.CustomerReturn)
      .addWildCard()
      .build()
  );

  const { invoiceNumber = '' } = useParams();
  const api = useReturnsApi();

  const query = useQuery(
    api.keys.customerDetail(invoiceNumber),
    () => api.get.customerReturnByNumber(Number(invoiceNumber)),
    {
      enabled: !!isCustomerReturnPage,
    }
  );

  const [patch, setPatch] = useState<Partial<CustomerReturnFragment>>({});

  const draft: CustomerReturnFragment | undefined = query.data
    ? { ...query.data, ...patch }
    : undefined;

  // TODO, future: Co-locate this with the update mutation, so one "update" call would
  // update the patch state and the queue the debounced mutation call
  const setDraft = (patch: Partial<CustomerReturnFragment>) => {
    setPatch(state => ({ ...state, ...patch }));
  };

  return { ...query, draft, setDraft };
};
