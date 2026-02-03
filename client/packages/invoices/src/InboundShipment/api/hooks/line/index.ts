import { useDeleteInboundLines } from './useDeleteInboundLines';
import { useInboundDeleteSelectedLines } from './useDeleteSelectedLines';
import { useInboundItems } from './useInboundItems';
import { useInboundLines } from './useInboundLines';
import { useInboundServiceLines } from './useInboundServiceLines';
import { useLinesFromInternalOrder } from './useLinesFromInternalOrder';
import { useSaveInboundLines } from './useSaveInboundLines';
import { useZeroInboundLinesQuantity } from './useZeroInboundLinesQuantity';
import { useChangeStatusOfInboundLines } from './useChangeStatusOfInboundLines';

export const Lines = {
  useDeleteInboundLines,
  useInboundDeleteSelectedLines,
  useInboundItems,
  useInboundLines,
  useInboundServiceLines,
  useSaveInboundLines,
  useZeroInboundLinesQuantity,
  useLinesFromInternalOrder,
  useChangeStatusOfInboundLines,
};
