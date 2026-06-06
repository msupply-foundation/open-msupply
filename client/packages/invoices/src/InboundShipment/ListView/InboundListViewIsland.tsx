import React, { useEffect, useRef } from 'react';
import {
  useGql,
  useAuthContext,
  useTranslation,
  useNavigate,
  useFormatNumber,
  useFormatCurrency,
  useFormatDateTime,
  useIntlUtils,
  useQueryClient,
} from '@openmsupply-client/common';
import { IslandCtx, Island } from '../vanilla/context';
import { mountList } from '../vanilla/list/mountList';

/**
 * Thin React wrapper: gathers everything the plain-JS list island needs from
 * the app shell and mounts/unmounts it. No view logic lives here.
 */
export const InboundListViewIsland = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<Island | null>(null);

  const { client } = useGql();
  const { storeId, userHasPermission } = useAuthContext();
  const t = useTranslation();
  const navigate = useNavigate();
  const { format } = useFormatNumber();
  const formatCurrency = useFormatCurrency();
  const { localisedDate } = useFormatDateTime();
  const { isRtl } = useIntlUtils();
  const queryClient = useQueryClient();

  const buildCtx = (): IslandCtx => ({
    client,
    storeId,
    isExternal: false,
    t,
    navigate: to => navigate(to),
    userHasPermission,
    isRtl,
    formatters: {
      number: n => (n === undefined || n === null ? '' : format(n)),
      currency: n => (n === undefined || n === null ? '' : formatCurrency(n)),
      date: d => (d ? localisedDate(d) : ''),
    },
    invalidateShellQueries: () => queryClient.invalidateQueries(),
  });

  // Mount once.
  useEffect(() => {
    if (!containerRef.current) return;
    islandRef.current = mountList(containerRef.current, buildCtx());
    return () => islandRef.current?.unmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hot-update ctx on store/locale change (preserves in-page state).
  useEffect(() => {
    islandRef.current?.update?.(buildCtx());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, isRtl, t]);

  return <div ref={containerRef} style={{ height: '100%' }} />;
};
