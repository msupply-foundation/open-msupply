import { useInsertInboundReturn } from './useInsertInboundReturn';
import { useOutboundDeleteRows } from './useOutboundDeleteRows';
import { useOutbounds } from './useOutbounds';
import { useOutboundsAll } from './useOutboundsAll';
import { useInbounds } from './useInbounds';
import { useInboundsAll } from './useInboundsAll';
import { useInboundDeleteRows } from './useInboundDeleteRows';
import { useOutboundReturn } from './useOutboundReturn';
import { useInsertOutboundReturn } from './useInsertOutboundReturn';
import { useInboundReturn } from './useInboundReturn';
import { useInboundReturnDelete } from './useInboundDelete';
import { useUpdateOutboundReturn } from './useUpdateOutboundReturn';
import { useUpdateInboundReturn } from './useUpdateInboundReturn';
import { useOutboundReturnDelete } from './useOutboundDelete';

export const Document = {
  useOutboundReturn,
  useOutbounds,
  useOutboundsAll,
  useInbounds,
  useInboundReturn,
  useInboundsAll,

  useOutboundDeleteRows,
  useInboundDeleteRows,
  useInsertOutboundReturn,
  useUpdateOutboundReturn,
  useOutboundReturnDelete,

  useInsertInboundReturn,
  useUpdateInboundReturn,
  useInboundReturnDelete,
};
