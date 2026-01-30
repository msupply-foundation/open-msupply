import { useInbound } from './useInbound';
import { useInboundFields } from './useInboundFields';
import { useInbounds } from './useInbounds';
import { useInboundsAll } from './useInboundsAll';
import { useInsertInbound } from './useInsertInbound';
import { useUpdateInbound } from './useUpdateInbound';
import { useUpdateInboundServiceTax } from './useInboundUpdateServiceTax';
import { useInboundDelete } from './useInboundDelete';
import {
  useListInternalOrders,
  useListInternalOrdersPromise,
} from './useListInternalOrders';
import { useListInternalOrderLines } from './useListInternalOrderLines';
import { useListSentPurchaseOrders } from './useListSentPurchaseOrders';

export const Document = {
  useInboundDelete,
  useInbound,
  useInboundFields,
  useInbounds,
  useInboundsAll,
  useInsertInbound,
  useUpdateInbound,
  useUpdateInboundServiceTax,
  useListInternalOrders,
  useListInternalOrdersPromise,
  useListInternalOrderLines,
  useListSentPurchaseOrders,
};
