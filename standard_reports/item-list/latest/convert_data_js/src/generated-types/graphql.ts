import * as Types from '../../codegenTypes';

export type ItemListQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemCode?: Types.InputMaybe<Types.Scalars['String']['input']>;
  itemName?: Types.InputMaybe<Types.Scalars['String']['input']>;
  masterListId?: Types.InputMaybe<Types.Scalars['String']['input']>;
  isActive?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
}>;

export type ItemListQuery = {
  __typename?: 'Queries',
  items: {
    __typename?: 'ItemConnector',
    nodes: Array<{
      __typename?: 'ItemNode',
      id: string,
      code: string,
      name: string,
      venCategory: string,
      stats: {
        __typename?: 'ItemStatsNode',
        stockOnHand: number
      }
    }>
  }
};
