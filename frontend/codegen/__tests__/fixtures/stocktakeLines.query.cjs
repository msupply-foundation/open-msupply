/**
 * A realistic query against the example schema (fixtures/exampleSchema.js).
 * Mirrors the real src/stocktakeLines.graphql but trimmed to the smaller schema.
 * Exported as a string so the full-example test can show the exact INPUT.
 */
const STOCKTAKE_LINES_QUERY = /* GraphQL */ `
  query stocktakeLines(
    $stocktakeId: String!
    $page: PaginationInput
    $sort: [StocktakeLineSortInput!]
    $filter: StocktakeLineFilterInput
  ) {
    stocktakeLines(
      stocktakeId: $stocktakeId
      page: $page
      sort: $sort
      filter: $filter
    ) {
      __typename
      ... on StocktakeLineConnector {
        totalCount
        nodes {
          ...StocktakeLine
        }
      }
      ... on StocktakeDoesNotExist {
        description
      }
    }
  }

  fragment StocktakeLine on StocktakeLineNode {
    __typename
    id
    stocktakeId
    batch
    itemId
    itemName
    expiryDate
    packSize
    snapshotNumberOfPacks
    countedNumberOfPacks
    comment
    item {
      __typename
      id
      code
      name
      unitName
      isVaccine
      defaultPackSize
    }
    location {
      __typename
      id
      name
      code
      onHold
    }
    reasonOption {
      id
      reason
      type
      isActive
    }
  }
`;

module.exports = { STOCKTAKE_LINES_QUERY };
