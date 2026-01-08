import { ArrayElement, ConvertData } from '../convertDataType';
import { Arguments } from './generated-types/arguments';
import { ItemUsageQuery } from './generated-types/graphql';
import get from 'lodash/get';
import orderBy from 'lodash/orderBy';
import groupBy from 'lodash/groupBy';

type SqlResult = { item_id: string; quantity: number }[];
export type Data = ItemUsageQuery & {
  thisMonthConsumption: SqlResult;
  lastMonthConsumption: SqlResult;
  twoMonthsAgoConsumption: SqlResult;
  expiringInSixMonths: SqlResult;
  expiringInTwelveMonths: SqlResult;
  stockOnOrder: SqlResult;
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
  const thisMonthConsumptionMap = groupBy(data.thisMonthConsumption, 'item_id');
  const lastMonthConsumptionMap = groupBy(data.lastMonthConsumption, 'item_id');
  const twoMonthsAgoConsumptionMap = groupBy(
    data.twoMonthsAgoConsumption,
    'item_id'
  );
  const expiringInSixMonthsMap = groupBy(data.expiringInSixMonths, 'item_id');
  const expiringInTwelveMonthsMap = groupBy(
    data.expiringInTwelveMonths,
    'item_id'
  );
  const stockOnOrderMap = groupBy(data.stockOnOrder, 'item_id');

  let output = data.items.nodes.map(item => {
    let outputNode: OutputNode = {
      ...item,
      monthConsumption: thisMonthConsumptionMap[item.id]?.[0]?.quantity || 0,
      lastMonthConsumption:
        lastMonthConsumptionMap[item.id]?.[0]?.quantity || 0,
      twoMonthsAgoConsumption:
        twoMonthsAgoConsumptionMap[item.id]?.[0]?.quantity || 0,
      expiringInSixMonths: expiringInSixMonthsMap[item.id]?.[0]?.quantity || 0,
      expiringInTwelveMonths:
        expiringInTwelveMonthsMap[item.id]?.[0]?.quantity || 0,
      // invoice lines could add up to more then requested stock
      stockOnOrder: Math.max(0, stockOnOrderMap[item.id]?.[0]?.quantity || 0),
      SOH: item.stats?.stockOnHand || 0,
      MOS: item.stats?.availableMonthsOfStockOnHand || 0,
      AMC: item.stats?.averageMonthlyConsumption || 0,
      AMC12: item.AMC12Months.averageMonthlyConsumption || 0,
      AMC24: item.AMC24Months.averageMonthlyConsumption || 0,
    };
    return outputNode;
  });
  let sortedNodes = orderBy(
    output,
    row => {
      const field = get(row, sort || 'name');
      return typeof field == 'string' ? field.toLocaleLowerCase() : field;
    },
    dir || 'asc'
  );

  return { data: { items: { nodes: sortedNodes } } };
};
