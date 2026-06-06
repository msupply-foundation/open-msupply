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
  useParams,
  useLocation,
  useBreadcrumbs,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { IslandCtx, Island } from '../vanilla/context';
import { mountDetail } from '../vanilla/detail/mountDetail';

/**
 * Thin React wrapper for the plain-JS inbound detail island. Breadcrumbs stay
 * React: the island reports the loaded invoice number back via onInvoiceLoaded.
 */
export const InboundDetailViewIsland = () => {
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
  const { invoiceId = '' } = useParams();
  const location = useLocation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const isExternal = location.pathname.includes(
    AppRoute.InboundShipmentExternal
  );

  const buildCtx = (): IslandCtx => ({
    client,
    storeId,
    isExternal,
    invoiceId,
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
    onInvoiceLoaded: invoiceNumber =>
      setCustomBreadcrumbs({ 1: String(invoiceNumber) }),
  });

  useEffect(() => {
    if (!containerRef.current) return;
    islandRef.current = mountDetail(containerRef.current, buildCtx());
    return () => islandRef.current?.unmount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId, isExternal]);

  useEffect(() => {
    islandRef.current?.update?.(buildCtx());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, isRtl, t]);

  return <div ref={containerRef} style={{ height: '100%' }} />;
};
