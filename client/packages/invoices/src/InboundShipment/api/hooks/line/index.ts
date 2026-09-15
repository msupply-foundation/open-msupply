import { useDeleteInboundLines } from './useDeleteInboundLines';
import { useInboundDeleteSelectedLines } from './useDeleteSelectedLines';
import { useLinesFromInternalOrder } from './useLinesFromInternalOrder';
import { useSaveInboundLines } from './useSaveInboundLines';
import { useZeroInboundLinesQuantity } from './useZeroInboundLinesQuantity';
import { useChangeStatusOfInboundLines } from './useChangeStatusOfInboundLines';

export const Lines = {
  useDeleteInboundLines,
  useInboundDeleteSelectedLines,
  useSaveInboundLines,
  useZeroInboundLinesQuantity,
  useLinesFromInternalOrder,
  useChangeStatusOfInboundLines,
};
