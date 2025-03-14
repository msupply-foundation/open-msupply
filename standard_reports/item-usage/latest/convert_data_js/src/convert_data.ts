import { ArrayElement, ConvertData } from '../convertDataType';
import { Arguments } from './generated-types/arguments';
import { ItemUsageQuery } from './generated-types/graphql';
import get from 'lodash/get';
import orderBy from 'lodash/orderBy';

type SqlResult = { item_id: string; quantity: number }[];
export type Data = ItemUsageQuery & {
  thisMonthConsumption: SqlResult;
  lastMonthConsumption: SqlResult;
  twoMonthsAgoConsumption: SqlResult;
  expiringInSixMonths: SqlResult;
  expiringInTwelveMonths: SqlResult;
  stockOnOrder: SqlResult;
  AMCTwelve: SqlResult;
  AMCTwentyFour: SqlResult;
};

type OutputNode = ArrayElement<ItemUsageQuery['items']['nodes']> & {
  monthConsumption: number;
  lastMonthConsumption: number;
  twoMonthsAgoConsumption: number;
  expiringInSixMonths: number;
  expiringInTwelveMonths: number;
  stockOnOrder: number;
  AMC12: number;
  AMC24: number;
  SOH: number;
  MOS: number;
  AMC: number;
};

type Result = { items: { nodes: OutputNode[] } };

export const convert_data: ConvertData<Data, Arguments, Result> = ({
  data,
  arguments: { sort, dir },
}) => {
  let output = data.items.nodes.map((item) => {
    let outputNode: OutputNode = {
      ...item,
      monthConsumption: calculateQuantity(data.thisMonthConsumption, item.id),
      lastMonthConsumption: calculateQuantity(data.lastMonthConsumption, item.id),
      twoMonthsAgoConsumption: calculateQuantity(data.twoMonthsAgoConsumption, item.id),
      expiringInSixMonths: calculateQuantity(data.expiringInSixMonths, item.id),
      expiringInTwelveMonths: calculateQuantity(data.expiringInTwelveMonths, item.id),
      stockOnOrder: calculateQuantity(data.stockOnOrder, item.id),
      AMC12: calculateQuantity(data.AMCTwelve, item.id),
      AMC24: calculateQuantity(data.AMCTwentyFour, item.id),
      SOH: calculateStatValue(item.stats?.stockOnHand),
      MOS: calculateStatValue(item.stats?.availableMonthsOfStockOnHand),
      AMC: calculateStatValue(item.stats?.averageMonthlyConsumption),
    };
    return outputNode;
  });

  let sortedNodes = orderBy(
    output,
    (row) => {
      const field = get(row, sort || 'name');
      return typeof field == 'string' ? field.toLocaleLowerCase() : field;
    },
    dir || 'asc'
  );

  // log('debug log'); // Example log, from README.md

  return { data: { items: { nodes: sortedNodes } } };
};

// function adds month consumption to data  (either this or last month)
const calculateQuantity = (queryResult: SqlResult, id: string) => {
  let quantity = 0;
  if (!!queryResult && !!id) {
    const node = queryResult.find((element) => element.item_id == id);
    quantity = node?.quantity ? node.quantity : 0;
  }
  // return 0 if quantity is less than 0. This covers use cases such as stock on order which can be negative if invoice line stock is greater than requested stock.
  if (quantity < 0) {
    return 0;
  }
  return quantity;
};

const calculateStatValue = (value?: number | null) => {
  let returnValue = 0;
  if (!!value) {
    // round to 1 decimal
    returnValue = Math.round(value * 10) / 10;
  }
  return returnValue;
};
