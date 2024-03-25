import {
  RouteBuilder,
  useMatch,
  useParams,
  useQuery,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { useState, useEffect } from 'react';
import { InboundReturnFragment } from '../../operations.generated';
import { AppRoute } from 'packages/config/src';

export const useInboundReturn = () => {
  const isInboundReturnPage = useMatch(
    RouteBuilder.create(AppRoute.Distribution)
      .addPart(AppRoute.InboundReturn)
      .addWildCard()
      .build()
  );

  const { invoiceNumber = '' } = useParams();
  const api = useReturnsApi();

  const query = useQuery(
    api.keys.inboundDetail(invoiceNumber),
    () => api.get.inboundReturnByNumber(Number(invoiceNumber)),
    {
      enabled: !!isInboundReturnPage,
    }
  );

  const [bufferedState, setBufferedState] = useState(query.data);

  useEffect(() => setBufferedState(query.data), [query.isFetched]);

  // TODO, future: Co-locate this with the update mutation, so one "update" call would
  // update the buffered state and the queue the debounced mutation call
  const patchBufferedState = (patch: Partial<InboundReturnFragment>) => {
    setBufferedState(state => (!state ? undefined : { ...state, ...patch }));
  };

  return { ...query, bufferedState, setBufferedState: patchBufferedState };
};
