import { useInbound } from './useInbound';
import { useInboundsAll } from './useInboundsAll';
import { useUpdateInboundServiceTax } from './useInboundUpdateServiceTax';
import {
  useListInternalOrders,
  useListInternalOrdersPromise,
} from './useListInternalOrders';
import { useListInternalOrderLines } from './useListInternalOrderLines';
import { useInboundList } from './useInboundList';
import { useInboundShipment } from './useInboundShipment';

export const Document = {
  useInbound,
  useInboundsAll,
  useUpdateInboundServiceTax,
  useListInternalOrders,
  useListInternalOrdersPromise,
  useListInternalOrderLines,
  useInboundList,
  useInboundShipment,
};
