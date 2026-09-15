import * as Types from '../../codegenTypes';

export type ItemUsageQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemCode?: Types.InputMaybe<Types.Scalars['String']['input']>;
  itemName?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type ItemUsageQuery = {
  __typename?: 'Queries',
  items: {
    __typename?: 'ItemConnector',
    nodes: Array<{
      __typename?: 'ItemNode',
      id: string,
      code: string,
      name: string,
      stats: {
        __typename?: 'ItemStatsNode',
        totalConsumption: number,
        availableMonthsOfStockOnHand?: number | null,
        stockOnHand: number,
        averageMonthlyConsumption: number
      },
      AMC12Months: {
        __typename?: 'ItemStatsNode',
        averageMonthlyConsumption: number
      },
      AMC24Months: {
        __typename?: 'ItemStatsNode',
        averageMonthlyConsumption: number
      }
    }>
  }
};
