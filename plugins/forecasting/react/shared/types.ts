export type Graphql = {
  input:
    | {
        type: 'aggregateAmc';
        itemIds: string[];
      }
    | { type: 'echo'; echo: string };
  output:
    | {
        type: 'aggregateAmc';
        stats: { itemId: string; name: string; amc: number }[];
      }
    | { type: 'echo'; echo: string };
};
