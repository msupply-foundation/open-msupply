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
      monthConsumption: getQuantity(data.thisMonthConsumption, item.id),
      lastMonthConsumption: getQuantity(data.lastMonthConsumption, item.id),
      twoMonthsAgoConsumption: getQuantity(data.twoMonthsAgoConsumption, item.id),
      expiringInSixMonths: getQuantity(data.expiringInSixMonths, item.id),
      expiringInTwelveMonths: getQuantity(data.expiringInTwelveMonths, item.id),
      // invoice lines could add up to more then requested stock
      stockOnOrder: Math.max(getQuantity(data.stockOnOrder, item.id), 0),
      AMC12: getQuantity(data.AMCTwelve, item.id),
      AMC24: getQuantity(data.AMCTwentyFour, item.id),
      SOH: item.stats?.stockOnHand || 0,
      MOS: item.stats?.availableMonthsOfStockOnHand || 0,
      AMC: item.stats?.averageMonthlyConsumption || 0,
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
const getQuantity = (queryResult: SqlResult, id: string) =>
  queryResult.find((element) => element.item_id == id)?.quantity || 0;
