import { useQuery } from '@openmsupply-client/common';
import { InboundFragment } from '../../operations.generated';
import { useDeleteInboundLines } from './useDeleteInboundLines';
import { useDeleteSelectedLines } from './useDeleteSelectedLines';
import { useInboundApi } from '../utils/useInboundApi';
import { useInboundItems } from './useInboundItems';
import { useInboundLines } from './useInboundLines';
import { useInboundNumber } from '../document/useInbound';
import { useInboundRows } from './useInboundRows';
import { useInboundServiceLines } from './useInboundServiceLines';
import { useSaveInboundLines } from './useSaveInboundLines';

export const useInboundSelector = <T = InboundFragment>(
  select?: (data: InboundFragment) => T
) => {
  const invoiceNumber = useInboundNumber();
  const api = useInboundApi();

  return useQuery(
    api.keys.detail(invoiceNumber),
    () => api.get.byNumber(invoiceNumber),
    { select }
  );
};

export const Lines = {
  useDeleteInboundLines,
  useDeleteSelectedLines,
  useInboundItems,
  useInboundLines,
  useInboundRows,
  useInboundServiceLines,
  useSaveInboundLines,
};
