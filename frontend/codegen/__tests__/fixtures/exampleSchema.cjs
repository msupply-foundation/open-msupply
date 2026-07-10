/**
 * A small, self-contained example schema used by the "real world" tests.
 *
 * It is deliberately a trimmed-down version of the kind of schema the project
 * actually generates against (see src/stocktakeLines.graphql). Keeping it here
 * as plain SDL means a reader can see exactly what shape of schema produces the
 * generated output asserted in the tests — no introspection or live server.
 */
const EXAMPLE_SCHEMA = /* GraphQL */ `
  scalar NaiveDate
  scalar DateTime

  enum ReasonType {
    POSITIVE_INVENTORY_ADJUSTMENT
    NEGATIVE_INVENTORY_ADJUSTMENT
  }

  enum StocktakeLineSortField {
    itemName
    expiryDate
    packSize
  }

  input PaginationInput {
    first: Int
    offset: Int
  }

  input StocktakeLineSortInput {
    key: StocktakeLineSortField!
    desc: Boolean
  }

  input EqualFilterStringInput {
    equalTo: String
    equalAny: [String!]
    notEqualTo: String
  }

  input StocktakeLineFilterInput {
    id: EqualFilterStringInput
    itemId: EqualFilterStringInput
  }

  type ItemNode {
    id: ID!
    code: String!
    name: String!
    unitName: String
    isVaccine: Boolean!
    defaultPackSize: Float!
  }

  type LocationNode {
    id: ID!
    name: String!
    code: String!
    onHold: Boolean!
  }

  type ReasonOptionNode {
    id: ID!
    reason: String!
    type: ReasonType!
    isActive: Boolean!
  }

  type StocktakeLineNode {
    id: ID!
    stocktakeId: String!
    batch: String
    itemId: String!
    itemName: String!
    expiryDate: NaiveDate
    packSize: Float
    snapshotNumberOfPacks: Float!
    countedNumberOfPacks: Float
    comment: String
    item: ItemNode!
    location: LocationNode
    reasonOption: ReasonOptionNode
  }

  type StocktakeLineConnector {
    totalCount: Int!
    nodes: [StocktakeLineNode!]!
  }

  # An error variant, so the response is a union — the common mSupply pattern of
  # "<Connector> | <Error>" returned from a query.
  type StocktakeDoesNotExist {
    description: String!
  }

  union StocktakeLinesResponse = StocktakeLineConnector | StocktakeDoesNotExist

  type Query {
    stocktakeLines(
      stocktakeId: String!
      page: PaginationInput
      sort: [StocktakeLineSortInput!]
      filter: StocktakeLineFilterInput
    ): StocktakeLinesResponse!
  }
`;

module.exports = { EXAMPLE_SCHEMA };
