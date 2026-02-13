// import { NameFilterInput, ItemFilterInput } from '../../codegenTypes';

export type IssueStockEndpointInput = {
  customerCode: string;
  universalCode: string;
  numberOfUnits: number;
};

export type IssueStockEndpointResponse = {
  success: boolean;
  message: string;
};

export type Graphql = {
  input: IssueStockEndpointInput;
  output: IssueStockEndpointResponse;
};
