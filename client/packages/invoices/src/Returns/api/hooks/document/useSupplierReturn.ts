import {
  RouteBuilder,
  useMatch,
  useParams,
  useQuery,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { useEffect, useState } from 'react';
import { SupplierReturnFragment } from '../..';
import { AppRoute } from '@openmsupply-client/config/src';

export const useSupplierReturn = () => {
  const isSupplierReturnPage = useMatch(
    RouteBuilder.create(AppRoute.Replenishment)
      .addPart(AppRoute.SupplierReturn)
      .addWildCard()
      .build()
  );

  const { invoiceNumber } = useParams();
  const api = useReturnsApi();

  const query = useQuery(
    api.keys.supplierDetail(invoiceNumber ?? ''),
    () => api.get.supplierReturnByNumber(Number(invoiceNumber)),
    {
      enabled: !!isSupplierReturnPage,
    }
  );

  const [bufferedState, setBufferedState] = useState(query.data);

  useEffect(() => setBufferedState(query.data), [query.isFetched]);

  // TODO, future: Co-locate this with the update mutation, so one "update" call would
  // update the buffered state and the queue the debounced mutation call
  const patchBufferedState = (patch: Partial<SupplierReturnFragment>) => {
    setBufferedState(state => (!state ? undefined : { ...state, ...patch }));
  };

  return { ...query, bufferedState, setBufferedState: patchBufferedState };
};
