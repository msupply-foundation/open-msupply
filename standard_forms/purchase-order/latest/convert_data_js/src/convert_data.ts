import { ArrayElement, ConvertData } from "../convertDataType";
import { PurchaseOrderQuery } from "./generated-types/graphql";
import get from "lodash/get";
import orderBy from "lodash/orderBy";
import groupBy from "lodash/groupBy";

export type Data = PurchaseOrderQuery & {};

// type OutputLineNode =
//   ArrayElement<PurchaseOrderQuery["purchaseOrder"]> & {
//     lineTotal: number; };

// type Result = { purchaseOrderLines: { nodes: OutputNode[] } };

export const convert_data: ConvertData<Data, any> = ({ data }) => {
  if (typeof data.purchaseOrder != null) {
    var lineCost =
      data.purchaseOrder.lines.pricePerUnitAfterDiscount *
      data.purchaseOrder.requestedNumberOfUnits;
  }
};
