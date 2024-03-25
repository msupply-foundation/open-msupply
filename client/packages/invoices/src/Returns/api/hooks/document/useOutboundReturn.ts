import {
  RouteBuilder,
  useMatch,
  useParams,
  useQuery,
} from '@openmsupply-client/common';
import { useReturnsApi } from '../utils/useReturnsApi';
import { useEffect, useState } from 'react';
import { OutboundReturnFragment } from '../..';
import { AppRoute } from 'packages/config/src';

export const useOutboundReturn = () => {
  const isOutboundReturnPage = useMatch(
    RouteBuilder.create(AppRoute.Replenishment)
      .addPart(AppRoute.OutboundReturn)
      .addWildCard()
      .build()
  );

  const { invoiceNumber } = useParams();
  const api = useReturnsApi();

  const query = useQuery(
    api.keys.outboundDetail(invoiceNumber ?? ''),
    () => api.get.outboundReturnByNumber(Number(invoiceNumber)),
    {
      enabled: !!isOutboundReturnPage,
    }
  );

  const [bufferedState, setBufferedState] = useState(query.data);

  useEffect(() => setBufferedState(query.data), [query.isFetched]);

  // TODO, future: Co-locate this with the update mutation, so one "update" call would
  // update the buffered state and the queue the debounced mutation call
  const patchBufferedState = (patch: Partial<OutboundReturnFragment>) => {
    setBufferedState(state => (!state ? undefined : { ...state, ...patch }));
  };

  return { ...query, bufferedState, setBufferedState: patchBufferedState };
};
