import { useUpdateInboundServiceTax } from './useInboundUpdateServiceTax';
import {
  useListInternalOrders,
  useListInternalOrdersPromise,
} from './useListInternalOrders';
import { useListInternalOrderLines } from './useListInternalOrderLines';
import { useInboundList } from './useInboundList';
import { useInboundShipment } from './useInboundShipment';

export const Document = {
  useUpdateInboundServiceTax,
  useListInternalOrders,
  useListInternalOrdersPromise,
  useListInternalOrderLines,
  useInboundList,
  useInboundShipment,
};
