import {
  RouteBuilder,
  useMatch,
  useParams,
  useQuery,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { useState, useEffect } from 'react';
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

  const [bufferedState, setBufferedState] = useState(query.data);

  useEffect(() => setBufferedState(query.data), [query.isFetched]);

  // TODO, future: Co-locate this with the update mutation, so one "update" call would
  // update the buffered state and the queue the debounced mutation call
  const patchBufferedState = (patch: Partial<CustomerReturnFragment>) => {
    setBufferedState(state => (!state ? undefined : { ...state, ...patch }));
  };

  return { ...query, bufferedState, setBufferedState: patchBufferedState };
};
